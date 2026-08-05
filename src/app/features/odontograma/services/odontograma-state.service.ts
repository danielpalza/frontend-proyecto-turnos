import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, tap, catchError, of, switchMap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OdontogramaService } from '../../../core/services/odontograma.service';
import { PeriodontogramaService } from '../../../core/services/periodontograma.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientService } from '../../../core/services/patient.service';
import { ClinicalAttentionService } from '../../../core/services/clinical-attention.service';
import { Appointment } from '../../../core/models/appointment.model';
import { Patient } from '../../../core/models/patient.model';
import { parseAnamnesis } from '../../../core/utils/anamnesis.util';
import {
  FaceKey,
  OdontogramaPagoDelta,
  TurnoCompletoDeltaRequest,
  TurnoCompletoResponse
} from '../../../core/models/odontograma.model';
import { PerioToothMvp } from '../../../core/models/periodontograma.model';
import { emptyOdontoResponse } from './odonto-delta.util';
import { emptyPerioResponse } from './perio-delta.util';
import { OdontoStateService, LeyendaItem } from './odonto-state.service';
import { PerioStateService } from './perio-state.service';

export type { LeyendaItem };

/**
 * Fachada delgada que orquesta la carga y guardado combinados de odontograma+periodontograma.
 * El estado propio de cada uno vive en OdontoStateService/PerioStateService; esta clase solo
 * coordina la identidad del turno, el snapshot de pago, y las dos llamadas HTTP combinadas.
 */
@Injectable({ providedIn: 'root' })
export class OdontogramaStateService {
  private appointmentId: string | null = null;

  private readonly appointmentPaymentSubject = new BehaviorSubject<{
    precioBono: number;
    precioTratamiento: number;
    extras: number;
    montoPago: number;
    observaciones: string;
    observacionesTurno: string;
  }>({
    precioBono: 0,
    precioTratamiento: 0,
    extras: 0,
    montoPago: 0,
    observaciones: '',
    observacionesTurno: ''
  });

  /**
   * `false` cuando el turno quedó cerrado por la regla legal (el paciente ya tiene un registro
   * clínico posterior). La vista lo usa para pasar a solo lectura; quien realmente impide escribir
   * son los mutadores de Odonto/PerioStateService y, sobre todo, el backend.
   */
  private readonly editableSubject = new BehaviorSubject<boolean>(true);
  readonly editable$ = this.editableSubject.asObservable();

  get isEditable(): boolean {
    return this.editableSubject.value;
  }

  get appointmentPaymentSnapshot() {
    return this.appointmentPaymentSubject.value;
  }

  /** Refresca el snapshot de pago desde el backend (evita sobreescribir un pago agregado desde otra pestaña mientras tanto). */
  refreshAppointmentPaymentSnapshot(): Observable<void> {
    const id = this.appointmentId;
    if (!id) {
      return of(undefined);
    }
    return this.appointmentsService.findById(id).pipe(
      tap(appointment => {
        if (appointment) {
          this.appointmentPaymentSubject.next({
            precioBono: appointment.precioBono ?? 0,
            precioTratamiento: appointment.precioTratamiento ?? 0,
            extras: appointment.extras ?? 0,
            montoPago: appointment.montoPago ?? 0,
            observaciones: appointment.observaciones ?? '',
            observacionesTurno: appointment.observacionesTurno ?? ''
          });
        }
      }),
      map(() => undefined)
    );
  }

  constructor(
    private readonly odontogramaService: OdontogramaService,
    private readonly periodontogramaService: PeriodontogramaService,
    private readonly appointmentsService: AppointmentsService,
    private readonly patientService: PatientService,
    private readonly odontoState: OdontoStateService,
    private readonly perioState: PerioStateService,
    private readonly clinicalAttention: ClinicalAttentionService
  ) {}

  loadForAppointment(appointmentId: string): Observable<void> {
    return forkJoin({
      odonto: this.odontogramaService.getByAppointment(appointmentId).pipe(
        catchError((err: HttpErrorResponse) => err.status === 404
          ? of(emptyOdontoResponse(appointmentId))
          : throwError(() => err))
      ),
      perio: this.periodontogramaService.getByAppointment(appointmentId).pipe(
        catchError((err: HttpErrorResponse) => err.status === 404
          ? of(emptyPerioResponse(appointmentId))
          : throwError(() => err))
      ),
      appointment: this.appointmentsService.findById(appointmentId).pipe(
        catchError((err: HttpErrorResponse) => err.status === 404
          ? of(null as unknown as Appointment)
          : throwError(() => err))
      )
    }).pipe(
      tap(({ odonto, perio, appointment }) => {
        this.appointmentId = appointmentId;
        this.clinicalAttention.record(appointmentId, 'odontograma');

        // Ausente = editable: si el backend no opina, manda él al guardar.
        const editable = odonto.editable !== false && perio.editable !== false;
        this.editableSubject.next(editable);

        if (appointment) {
          this.appointmentPaymentSubject.next({
            precioBono: appointment.precioBono ?? 0,
            precioTratamiento: appointment.precioTratamiento ?? 0,
            extras: appointment.extras ?? 0,
            montoPago: appointment.montoPago ?? 0,
            observaciones: appointment.observaciones ?? '',
            observacionesTurno: appointment.observacionesTurno ?? ''
          });

          // Marcar el turno como EN_CURSO si esta pendiente o confirmado. Un turno cerrado se abre
          // solo para consultarlo: no se le cambia el estado por mirarlo.
          if (editable && (appointment.estado === 'PENDIENTE' || appointment.estado === 'CONFIRMADO')) {
            this.appointmentsService.updateStatus(appointmentId, 'EN_CURSO').subscribe({
              error: err => console.error('No se pudo marcar el turno como EN_CURSO:', err)
            });
          }
        }

        this.odontoState.loadOdonto(odonto);
        this.perioState.loadPerio(perio);
      }),
      // Los antecedentes médicos viven en el paciente, no en el turno: el id recién se conoce cuando
      // responde el forkJoin. Si el fetch falla, el odontograma igual se abre (panel vacío).
      switchMap(({ appointment }) => appointment?.patientId
        ? this.patientService.findById(appointment.patientId).pipe(
            catchError(() => of(null as Patient | null))
          )
        : of(null as Patient | null)),
      tap(patient => this.odontoState.setHistoriaClinica(parseAnamnesis(patient?.anamnesis))),
      map(() => undefined)
    );
  }

  saveTurnoCompleto(pago?: OdontogramaPagoDelta): Observable<TurnoCompletoResponse> {
    if (!this.appointmentId) {
      throw new Error('No hay turno cargado');
    }

    const odontoDelta = this.odontoState.buildOdontogramDelta(pago);
    const perioDelta = this.perioState.buildPeriodontogramDelta();

    const combined: TurnoCompletoDeltaRequest = {
      odontograma: odontoDelta,
      periodontograma: perioDelta
    };

    return this.odontogramaService.saveTurnoCompleto(this.appointmentId, combined).pipe(
      tap(response => {
        if (response.odontograma) {
          this.odontoState.applySaveResponse(response.odontograma);
        }
        if (response.periodontograma) {
          this.perioState.applySaveResponse(response.periodontograma);
        }
      })
    );
  }

  // --- Pass-throughs de odonto (mantienen la API pública sin cambios para los consumidores) ---

  get selectedTooth$() { return this.odontoState.selectedTooth$; }
  get faces$() { return this.odontoState.faces$; }
  get toothIcons$() { return this.odontoState.toothIcons$; }
  get comentario$() { return this.odontoState.comentario$; }
  get planTratamiento$() { return this.odontoState.planTratamiento$; }
  get comentarioAnterior$() { return this.odontoState.comentarioAnterior$; }
  get historiaClinica$() { return this.odontoState.historiaClinica$; }

  selectTooth(tooth: number | null): void {
    this.odontoState.selectTooth(tooth);
  }

  getFaceState(toothNumber: number, face: FaceKey) {
    return this.odontoState.getFaceState(toothNumber, face);
  }

  cycleFace(toothNumber: number, face: FaceKey): void {
    this.odontoState.cycleFace(toothNumber, face);
  }

  toggleItemForSelectedTooth(item: LeyendaItem, checked: boolean): void {
    this.odontoState.toggleItemForSelectedTooth(item, checked);
  }

  isItemSelectedForCurrentTooth(label: string): boolean {
    return this.odontoState.isItemSelectedForCurrentTooth(label);
  }

  getIconsForTooth(tooth: number): LeyendaItem[] {
    return this.odontoState.getIconsForTooth(tooth);
  }

  removeItemsByLabelsForSelectedTooth(labels: string[]): void {
    this.odontoState.removeItemsByLabelsForSelectedTooth(labels);
  }

  setComentario(value: string): void {
    this.odontoState.setComentario(value);
  }

  setPlanTratamiento(value: string): void {
    this.odontoState.setPlanTratamiento(value);
  }

  // --- Pass-throughs de perio ---

  get perioTeeth$() { return this.perioState.perioTeeth$; }

  getPerioTeethMap(): Map<number, PerioToothMvp> {
    return this.perioState.getPerioTeethMap();
  }

  notifyPerioChange(): void {
    this.perioState.notifyPerioChange();
  }

  updatePerioTooth(toothId: number, updater: (tooth: PerioToothMvp) => void): void {
    this.perioState.updatePerioTooth(toothId, updater);
  }
}
