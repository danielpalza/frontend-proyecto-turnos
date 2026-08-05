import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, tap, throwError } from 'rxjs';
import { HistoriaClinicaService } from '../../../core/services/historia-clinica.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { ClinicalAttentionService } from '../../../core/services/clinical-attention.service';
import { HistoriaClinicaDeltaRequest, HistoriaClinicaResponse } from '../../../core/models/historia-clinica.model';
import { Appointment } from '../../../core/models/appointment.model';

function emptyResponse(appointmentId: string): HistoriaClinicaResponse {
  return { appointmentId, patientId: '', estado: 'BORRADOR', editable: true };
}

/**
 * Fachada de estado para el formulario de Historia Clínica Básica. Mirror simplificado de
 * OdontogramaStateService: acá no hace falta separar en sub-services por dominio (no hay
 * granularidad por diente), el formulario es un único `HistoriaClinicaResponse` plano.
 */
@Injectable({ providedIn: 'root' })
export class HistoriaClinicaStateService {
  private appointmentId: string | null = null;

  private readonly formSubject = new BehaviorSubject<HistoriaClinicaResponse | null>(null);
  readonly form$ = this.formSubject.asObservable();

  private readonly editableSubject = new BehaviorSubject<boolean>(true);
  readonly editable$ = this.editableSubject.asObservable();

  get isEditable(): boolean {
    return this.editableSubject.value;
  }

  get formValue(): HistoriaClinicaResponse | null {
    return this.formSubject.value;
  }

  constructor(
    private readonly historiaClinicaService: HistoriaClinicaService,
    private readonly appointmentsService: AppointmentsService,
    private readonly clinicalAttention: ClinicalAttentionService
  ) {}

  loadForAppointment(appointmentId: string): Observable<void> {
    return forkJoin({
      historiaClinica: this.historiaClinicaService.getByAppointment(appointmentId).pipe(
        catchError((err: HttpErrorResponse) => err.status === 404
          ? of(emptyResponse(appointmentId))
          : throwError(() => err))
      ),
      appointment: this.appointmentsService.findById(appointmentId).pipe(
        catchError((err: HttpErrorResponse) => err.status === 404
          ? of(null as unknown as Appointment)
          : throwError(() => err))
      )
    }).pipe(
      tap(({ historiaClinica, appointment }) => {
        this.appointmentId = appointmentId;
        this.clinicalAttention.record(appointmentId, 'historia-clinica');

        const editable = historiaClinica.editable !== false;
        this.editableSubject.next(editable);
        this.formSubject.next(historiaClinica);

        // Marcar el turno como EN_CURSO si esta pendiente o confirmado, igual que al abrir el
        // odontograma: es el efecto de atender, no de gestionar la agenda.
        if (appointment && editable
            && (appointment.estado === 'PENDIENTE' || appointment.estado === 'CONFIRMADO')) {
          this.appointmentsService.updateStatus(appointmentId, 'EN_CURSO').subscribe({
            error: err => console.error('No se pudo marcar el turno como EN_CURSO:', err)
          });
        }
      }),
      map(() => undefined)
    );
  }

  saveDraft(delta: HistoriaClinicaDeltaRequest): Observable<HistoriaClinicaResponse> {
    if (!this.appointmentId) {
      throw new Error('No hay turno cargado');
    }
    return this.historiaClinicaService.saveDraft(this.appointmentId, delta).pipe(
      tap(response => {
        this.formSubject.next(response);
        this.editableSubject.next(response.editable !== false);
      })
    );
  }

  sign(delta: HistoriaClinicaDeltaRequest): Observable<HistoriaClinicaResponse> {
    if (!this.appointmentId) {
      throw new Error('No hay turno cargado');
    }
    return this.historiaClinicaService.sign(this.appointmentId, delta).pipe(
      tap(response => {
        this.formSubject.next(response);
        this.editableSubject.next(response.editable !== false);
      })
    );
  }
}
