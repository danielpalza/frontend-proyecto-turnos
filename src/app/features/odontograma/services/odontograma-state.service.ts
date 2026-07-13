import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, tap, catchError, of } from 'rxjs';
import { OdontogramaService } from '../../../core/services/odontograma.service';
import { PeriodontogramaService } from '../../../core/services/periodontograma.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { Appointment } from '../../../core/models/appointment.model';
import {
  CaraDelta,
  EstadoCara,
  FaceKey,
  FACE_KEY_TO_CARA,
  LeyendaDelta,
  LEYENDA_LABEL_TO_VALOR,
  OdontogramaDeltaRequest,
  OdontogramaEstadoActual,
  OdontogramaPagoDelta,
  TurnoCompletoDeltaRequest,
  TurnoCompletoResponse,
  VALOR_TO_LEYENDA_LABEL
} from '../../../core/models/odontograma.model';
import {
  PerioToothMvp,
  PeriodontogramaDeltaRequest,
  PeriodontogramaDienteDelta,
  PeriodontogramaEstadoActual
} from '../../../core/models/periodontograma.model';
import {
  normalizeOdontoEstado,
  emptyOdontoResponse,
  mergeOdontoEstado,
  leyendaHasData,
  leyendaChanged,
  cloneOdontoEstado,
  emptyFaces,
  nextFaceState,
  caraToFaceKey
} from './odonto-delta.util';
import {
  normalizePerioEstado,
  emptyPerioResponse,
  mergePerioEstado,
  toothToDelta,
  dienteDeltaToTooth,
  dienteDeltaEquals,
  hasPerioData,
  makeEmptyPerioTooth,
  clonePerioEstado
} from './perio-delta.util';

export interface LeyendaItem {
  label: string;
  icono: string;
}

const PERIO_TOOTH_IDS = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
];

const ALL_ODONTO_TOOTH_IDS = [
  ...PERIO_TOOTH_IDS,
  55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
  85, 84, 83, 82, 81, 71, 72, 73, 74, 75
];

const LEYENDA_ICONS: Record<string, string> = {
  Ausencia: 'bi bi-0-circle',
  Implante: 'bi bi-1-circle',
  Corona: 'bi bi-2-circle',
  Puente: 'bi bi-3-circle',
  Eripcion: 'bi bi-4-circle',
  'Retención': 'bi bi-5-circle',
  Erupcion: 'bi bi-6-circle',
  Impactado: 'bi bi-7-circle',
  Extraer: 'bi bi-8-circle',
  Endodoncia: 'bi bi-0-square',
  Fractura: 'bi bi-1-square',
  Lesion: 'bi bi-2-square',
  'Dolor/Sensibilidad': 'bi bi-3-square',
  M0: 'bi bi-0-circle-fill',
  M1: 'bi bi-1-circle-fill',
  M2: 'bi bi-2-circle-fill',
  M3: 'bi bi-3-circle-fill',
  F0: 'bi bi-0-square-fill',
  F1: 'bi bi-1-square-fill',
  F2: 'bi bi-2-square-fill',
  F3: 'bi bi-3-square-fill'
};

const MOBILITY_LABELS = ['M0', 'M1', 'M2', 'M3'];
const FURCA_LABELS = ['F0', 'F1', 'F2', 'F3'];
const LAST_APPOINTMENT_KEY = 'odontograma_last_appointment_id';

@Injectable({ providedIn: 'root' })
export class OdontogramaStateService {
  private appointmentId: string | null = null;

  private readonly selectedToothSubject = new BehaviorSubject<number | null>(null);
  readonly selectedTooth$ = this.selectedToothSubject.asObservable();

  private readonly facesSubject = new BehaviorSubject<Map<number, Record<FaceKey, EstadoCara>>>(new Map());
  readonly faces$ = this.facesSubject.asObservable();

  private readonly toothIconsSubject = new BehaviorSubject<Record<number, LeyendaItem[]>>({});
  readonly toothIcons$ = this.toothIconsSubject.asObservable();

  private readonly comentarioSubject = new BehaviorSubject<string>('');
  readonly comentario$ = this.comentarioSubject.asObservable();

  private readonly planTratamientoSubject = new BehaviorSubject<string>('');
  readonly planTratamiento$ = this.planTratamientoSubject.asObservable();

  // Hoy el backend no envía estos campos: quedan vacíos hasta que exista la fuente,
  // pero page y diálogo de guardado ya leen del mismo lugar.
  private readonly comentarioAnteriorSubject = new BehaviorSubject<string>('');
  readonly comentarioAnterior$ = this.comentarioAnteriorSubject.asObservable();

  private readonly historiaClinicaSubject = new BehaviorSubject<string>('');
  readonly historiaClinica$ = this.historiaClinicaSubject.asObservable();

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
  get appointmentPaymentSnapshot() {
    return this.appointmentPaymentSubject.value;
  }

  private readonly perioTeethSubject = new BehaviorSubject<Map<number, PerioToothMvp>>(new Map());
  readonly perioTeeth$ = this.perioTeethSubject.asObservable();

  private baselineOdonto: OdontogramaEstadoActual = { caras: [], leyendas: [] };
  private baselinePerio: PeriodontogramaEstadoActual = { dientes: [] };

  constructor(
    private readonly odontogramaService: OdontogramaService,
    private readonly periodontogramaService: PeriodontogramaService,
    private readonly appointmentsService: AppointmentsService
  ) {
    this.initEmptyPerioMap();
  }

  get appointmentIdValue(): string | null {
    if (this.appointmentId != null) {
      return this.appointmentId;
    }
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const stored = sessionStorage.getItem(LAST_APPOINTMENT_KEY);
    if (!stored) {
      return null;
    }
    return stored;
  }

  loadForAppointment(appointmentId: string): Observable<void> {
    return forkJoin({
      odonto: this.odontogramaService.getByAppointment(appointmentId).pipe(
        catchError(() => of(emptyOdontoResponse(appointmentId)))
      ),
      perio: this.periodontogramaService.getByAppointment(appointmentId).pipe(
        catchError(() => of(emptyPerioResponse(appointmentId)))
      ),
      appointment: this.appointmentsService.findById(appointmentId).pipe(
        catchError(() => of(null as unknown as Appointment))
      )
    }).pipe(
      tap(({ odonto, perio, appointment }) => {
        this.appointmentId = appointmentId;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(LAST_APPOINTMENT_KEY, String(appointmentId));
        }

        if (appointment) {
          this.appointmentPaymentSubject.next({
            precioBono: appointment.precioBono ?? 0,
            precioTratamiento: appointment.precioTratamiento ?? 0,
            extras: appointment.extras ?? 0,
            montoPago: appointment.montoPago ?? 0,
            observaciones: appointment.observaciones ?? '',
            observacionesTurno: appointment.observacionesTurno ?? ''
          });

          // Marcar el turno como EN_CURSO si esta pendiente o confirmado
          if (appointment.estado === 'PENDIENTE' || appointment.estado === 'CONFIRMADO') {
            this.appointmentsService.updateStatus(appointmentId, 'EN_CURSO').subscribe();
          }
        }

        const mergedOdonto = mergeOdontoEstado(
          normalizeOdontoEstado(odonto.estadoActual),
          normalizeOdontoEstado(odonto.cambiosTurno)
        );
        this.baselineOdonto = cloneOdontoEstado(mergedOdonto);
        this.applyOdontoState(mergedOdonto);
        this.comentarioSubject.next(odonto.comentario ?? '');
        this.planTratamientoSubject.next(odonto.planTratamiento ?? '');
        this.comentarioAnteriorSubject.next(odonto.comentarioAnterior ?? '');

        const mergedPerio = mergePerioEstado(
          normalizePerioEstado(perio.estadoActual),
          normalizePerioEstado(perio.cambiosTurno)
        );
        this.baselinePerio = clonePerioEstado(mergedPerio);
        this.applyPerioState(mergedPerio);
      }),
      map(() => undefined)
    );
  }

  saveTurnoCompleto(pago?: OdontogramaPagoDelta): Observable<TurnoCompletoResponse> {
    if (!this.appointmentId) {
      throw new Error('No hay turno cargado');
    }

    const odontoDelta = this.buildOdontogramDelta(pago);
    const perioDelta = this.buildPeriodontogramDelta();

    const combined: TurnoCompletoDeltaRequest = {
      odontograma: odontoDelta,
      periodontograma: perioDelta
    };

    return this.odontogramaService.saveTurnoCompleto(this.appointmentId, combined).pipe(
      tap(response => {
        // Actualizar baseline odonto
        if (response.odontograma) {
          const mergedOdonto = mergeOdontoEstado(
            response.odontograma.estadoActual,
            response.odontograma.cambiosTurno
          );
          this.baselineOdonto = cloneOdontoEstado(mergedOdonto);
          this.applyOdontoState(mergedOdonto);
          this.comentarioSubject.next(response.odontograma.comentario ?? '');
          this.planTratamientoSubject.next(response.odontograma.planTratamiento ?? '');
        }

        // Actualizar baseline perio
        if (response.periodontograma) {
          const mergedPerio = mergePerioEstado(
            response.periodontograma.estadoActual,
            response.periodontograma.cambiosTurno
          );
          this.baselinePerio = clonePerioEstado(mergedPerio);
          this.applyPerioState(mergedPerio);
        }
      })
    );
  }

  selectTooth(tooth: number | null): void {
    this.selectedToothSubject.next(tooth);
  }

  getFaceState(toothNumber: number, face: FaceKey): EstadoCara {
    return this.facesSubject.value.get(toothNumber)?.[face] ?? 'normal';
  }

  cycleFace(toothNumber: number, face: FaceKey): void {
    const map = new Map(this.facesSubject.value);
    const current = { ...(map.get(toothNumber) ?? emptyFaces()) };
    current[face] = nextFaceState(current[face]);
    map.set(toothNumber, current);
    this.facesSubject.next(map);
  }

  toggleItemForSelectedTooth(item: LeyendaItem, checked: boolean): void {
    const selectedTooth = this.selectedToothSubject.value;
    if (!selectedTooth) {
      return;
    }

    const currentState = { ...this.toothIconsSubject.value };
    const currentItems = [...(currentState[selectedTooth] ?? [])];
    const alreadySelected = currentItems.some(existing => existing.label === item.label);

    let nextItems = currentItems;
    if (checked && !alreadySelected) {
      nextItems = [...currentItems, item];
    } else if (!checked && alreadySelected) {
      nextItems = currentItems.filter(existing => existing.label !== item.label);
    }

    currentState[selectedTooth] = nextItems;
    this.toothIconsSubject.next(currentState);
  }

  isItemSelectedForCurrentTooth(label: string): boolean {
    const selectedTooth = this.selectedToothSubject.value;
    if (!selectedTooth) {
      return false;
    }
    const toothItems = this.toothIconsSubject.value[selectedTooth] ?? [];
    return toothItems.some(item => item.label === label);
  }

  getIconsForTooth(tooth: number): LeyendaItem[] {
    return this.toothIconsSubject.value[tooth] ?? [];
  }

  removeItemsByLabelsForSelectedTooth(labels: string[]): void {
    const selectedTooth = this.selectedToothSubject.value;
    if (!selectedTooth) {
      return;
    }

    const currentState = { ...this.toothIconsSubject.value };
    const currentItems = currentState[selectedTooth] ?? [];
    currentState[selectedTooth] = currentItems.filter(item => !labels.includes(item.label));
    this.toothIconsSubject.next(currentState);
  }

  setComentario(value: string): void {
    this.comentarioSubject.next(value);
  }

  setPlanTratamiento(value: string): void {
    this.planTratamientoSubject.next(value);
  }

  getPerioTeethMap(): Map<number, PerioToothMvp> {
    return this.perioTeethSubject.value;
  }

  notifyPerioChange(): void {
    this.perioTeethSubject.next(new Map(this.perioTeethSubject.value));
  }

  updatePerioTooth(toothId: number, updater: (tooth: PerioToothMvp) => void): void {
    const map = new Map(this.perioTeethSubject.value);
    const tooth = map.get(toothId);
    if (!tooth) {
      return;
    }
    updater(tooth);
    map.set(toothId, tooth);
    this.perioTeethSubject.next(map);
  }

  private initEmptyPerioMap(): void {
    const map = new Map<number, PerioToothMvp>();
    PERIO_TOOTH_IDS.forEach(id => map.set(id, makeEmptyPerioTooth(id)));
    this.perioTeethSubject.next(map);
  }

  private applyOdontoState(state: OdontogramaEstadoActual): void {
    const facesMap = new Map<number, Record<FaceKey, EstadoCara>>();
    ALL_ODONTO_TOOTH_IDS.forEach(id => facesMap.set(id, emptyFaces()));

    for (const cara of state.caras ?? []) {
      const faceKey = caraToFaceKey(cara.cara);
      if (!faceKey) {
        continue;
      }
      const toothFaces = facesMap.get(cara.numeroDiente) ?? emptyFaces();
      toothFaces[faceKey] = cara.estado;
      facesMap.set(cara.numeroDiente, toothFaces);
    }
    this.facesSubject.next(facesMap);

    const icons: Record<number, LeyendaItem[]> = {};
    for (const leyenda of state.leyendas ?? []) {
      const items = icons[leyenda.numeroDiente] ?? [];

      // Leyendas de estado y condicion
      for (const valor in VALOR_TO_LEYENDA_LABEL) {
        const label = VALOR_TO_LEYENDA_LABEL[valor as keyof typeof VALOR_TO_LEYENDA_LABEL];
        if (!label) continue;
        const field = valor as keyof LeyendaDelta;
        if (leyenda[field]) {
          if (!items.some(i => i.label === label)) {
            items.push({ label, icono: LEYENDA_ICONS[label] ?? 'bi bi-circle' });
          }
        }
      }

      // Movilidad
      if (leyenda.movilidad != null) {
        const label = `M${leyenda.movilidad}`;
        if (!items.some(i => MOBILITY_LABELS.includes(i.label))) {
          items.push({ label, icono: LEYENDA_ICONS[label] ?? 'bi bi-circle-fill' });
        }
      }

      // Furca
      if (leyenda.furca != null) {
        const label = `F${leyenda.furca}`;
        if (!items.some(i => FURCA_LABELS.includes(i.label))) {
          items.push({ label, icono: LEYENDA_ICONS[label] ?? 'bi bi-square-fill' });
        }
      }

      icons[leyenda.numeroDiente] = items;
    }
    this.toothIconsSubject.next(icons);
  }

  private applyPerioState(state: PeriodontogramaEstadoActual): void {
    const map = new Map<number, PerioToothMvp>();
    PERIO_TOOTH_IDS.forEach(id => map.set(id, makeEmptyPerioTooth(id)));

    for (const d of state.dientes ?? []) {
      map.set(d.numeroDiente, dienteDeltaToTooth(d));
    }
    this.perioTeethSubject.next(map);
  }

  private buildOdontogramDelta(pago?: OdontogramaPagoDelta): OdontogramaDeltaRequest {
    const current = this.snapshotCurrentOdonto();
    const delta: OdontogramaDeltaRequest = {};

    const comentario = this.comentarioSubject.value;
    const plan = this.planTratamientoSubject.value;
    if (comentario !== (this.baselineOdonto as unknown as { comentario?: string }).comentario) {
      delta.comentario = comentario;
    }
    delta.planTratamiento = plan;

    delta.caras = current.caras.filter(c => {
      const baseline = this.baselineOdonto.caras.find(
        b => b.numeroDiente === c.numeroDiente && b.cara === c.cara
      );
      const baselineEstado = baseline?.estado ?? 'normal';
      return c.estado !== baselineEstado;
    });

    // Delta de leyendas unificado: incluir dientes que cambiaron respecto al baseline
    delta.leyendas = current.leyendas.filter(l => {
      const baseline = this.baselineOdonto.leyendas.find(b => b.numeroDiente === l.numeroDiente);
      if (!baseline) {
        return leyendaHasData(l);
      }
      return leyendaChanged(baseline, l);
    });

    if (pago) {
      delta.pago = pago;
    }

    return delta;
  }

  private buildPeriodontogramDelta(): PeriodontogramaDeltaRequest {
    const changed: PeriodontogramaDienteDelta[] = [];

    for (const tooth of this.perioTeethSubject.value.values()) {
      const current = toothToDelta(tooth);
      const baseline = this.baselinePerio.dientes.find(d => d.numeroDiente === tooth.id);
      if (!baseline) {
        if (hasPerioData(current)) {
          changed.push(current);
        }
      } else if (!dienteDeltaEquals(current, baseline)) {
        changed.push(current);
      }
    }

    return { dientes: changed };
  }

  private snapshotCurrentOdonto(): OdontogramaEstadoActual {
    const caras: CaraDelta[] = [];
    this.facesSubject.value.forEach((faces, numeroDiente) => {
      (Object.keys(faces) as FaceKey[]).forEach(faceKey => {
        const estado = faces[faceKey];
        if (estado !== 'normal') {
          caras.push({
            numeroDiente,
            cara: FACE_KEY_TO_CARA[faceKey],
            estado
          });
        }
      });
    });

    const leyendas: LeyendaDelta[] = [];
    Object.entries(this.toothIconsSubject.value).forEach(([toothStr, items]) => {
      const numeroDiente = Number(toothStr);
      const entry: LeyendaDelta = { numeroDiente };

      for (const item of items) {
        if (MOBILITY_LABELS.includes(item.label)) {
          entry.movilidad = Number(item.label.replace('M', ''));
          continue;
        }
        if (FURCA_LABELS.includes(item.label)) {
          entry.furca = Number(item.label.replace('F', ''));
          continue;
        }
        const mapping = LEYENDA_LABEL_TO_VALOR[item.label];
        if (mapping) {
          const key = mapping.valor as keyof LeyendaDelta;
          (entry as any)[key] = true;
          if (mapping.valor === 'ausencia') {
            entry.ausente = true;
          }
        }
      }

      leyendas.push(entry);
    });

    return { caras, leyendas };
  }

}
