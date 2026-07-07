import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, tap, catchError, finalize, of } from 'rxjs';
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
  OdontogramaResponse,
  TurnoCompletoDeltaRequest,
  TurnoCompletoResponse,
  VALOR_TO_LEYENDA_LABEL
} from '../../../core/models/odontograma.model';
import {
  PerioFaceMvp,
  PerioToothMvp,
  PeriodontogramaDeltaRequest,
  PeriodontogramaDienteDelta,
  PeriodontogramaEstadoActual,
  PeriodontogramaResponse
} from '../../../core/models/periodontograma.model';

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
  private patientId: string | null = null;

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
  readonly appointmentPayment$ = this.appointmentPaymentSubject.asObservable();
  get appointmentPaymentSnapshot() {
    return this.appointmentPaymentSubject.value;
  }

  private readonly perioTeethSubject = new BehaviorSubject<Map<number, PerioToothMvp>>(new Map());
  readonly perioTeeth$ = this.perioTeethSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

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
    this.loadingSubject.next(true);
    return forkJoin({
      odonto: this.odontogramaService.getByAppointment(appointmentId).pipe(
        catchError(() => of(this.emptyOdontoResponse(appointmentId)))
      ),
      perio: this.periodontogramaService.getByAppointment(appointmentId).pipe(
        catchError(() => of(this.emptyPerioResponse(appointmentId)))
      ),
      appointment: this.appointmentsService.findById(appointmentId).pipe(
        catchError(() => of(null as unknown as Appointment))
      )
    }).pipe(
      tap(({ odonto, perio, appointment }) => {
        this.appointmentId = appointmentId;
        this.patientId = odonto.patientId ?? null;
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

        const mergedOdonto = this.mergeOdontoEstado(
          this.normalizeOdontoEstado(odonto.estadoActual),
          this.normalizeOdontoEstado(odonto.cambiosTurno)
        );
        this.baselineOdonto = this.cloneOdontoEstado(mergedOdonto);
        this.applyOdontoState(mergedOdonto);
        this.comentarioSubject.next(odonto.comentario ?? '');
        this.planTratamientoSubject.next(odonto.planTratamiento ?? '');
        this.comentarioAnteriorSubject.next(odonto.comentarioAnterior ?? '');

        const mergedPerio = this.mergePerioEstado(
          this.normalizePerioEstado(perio.estadoActual),
          this.normalizePerioEstado(perio.cambiosTurno)
        );
        this.baselinePerio = this.clonePerioEstado(mergedPerio);
        this.applyPerioState(mergedPerio);
      }),
      map(() => undefined),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  saveOdontogram(pago?: OdontogramaPagoDelta): Observable<void> {
    if (!this.appointmentId) {
      throw new Error('No hay turno cargado');
    }

    const delta = this.buildOdontogramDelta(pago);
    return this.odontogramaService.saveDelta(this.appointmentId, delta).pipe(
      tap(response => {
        const merged = this.mergeOdontoEstado(response.estadoActual, response.cambiosTurno);
        this.baselineOdonto = this.cloneOdontoEstado(merged);
        this.applyOdontoState(merged);
        this.comentarioSubject.next(response.comentario ?? '');
        this.planTratamientoSubject.next(response.planTratamiento ?? '');
      }),
      map(() => undefined)
    );
  }

  savePeriodontogram(): Observable<void> {
    if (!this.appointmentId) {
      throw new Error('No hay turno cargado');
    }

    const delta = this.buildPeriodontogramDelta();
    return this.periodontogramaService.saveDelta(this.appointmentId, delta).pipe(
      tap(response => {
        const merged = this.mergePerioEstado(response.estadoActual, response.cambiosTurno);
        this.baselinePerio = this.clonePerioEstado(merged);
        this.applyPerioState(merged);
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
          const mergedOdonto = this.mergeOdontoEstado(
            response.odontograma.estadoActual,
            response.odontograma.cambiosTurno
          );
          this.baselineOdonto = this.cloneOdontoEstado(mergedOdonto);
          this.applyOdontoState(mergedOdonto);
          this.comentarioSubject.next(response.odontograma.comentario ?? '');
          this.planTratamientoSubject.next(response.odontograma.planTratamiento ?? '');
        }

        // Actualizar baseline perio
        if (response.periodontograma) {
          const mergedPerio = this.mergePerioEstado(
            response.periodontograma.estadoActual,
            response.periodontograma.cambiosTurno
          );
          this.baselinePerio = this.clonePerioEstado(mergedPerio);
          this.applyPerioState(mergedPerio);
        }
      })
    );
  }

  selectTooth(tooth: number | null): void {
    this.selectedToothSubject.next(tooth);
  }

  getSelectedTooth(): number | null {
    return this.selectedToothSubject.value;
  }

  getFaceState(toothNumber: number, face: FaceKey): EstadoCara {
    return this.facesSubject.value.get(toothNumber)?.[face] ?? 'normal';
  }

  cycleFace(toothNumber: number, face: FaceKey): void {
    const map = new Map(this.facesSubject.value);
    const current = { ...(map.get(toothNumber) ?? this.emptyFaces()) };
    current[face] = this.nextFaceState(current[face]);
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

  setComentarioAnterior(value: string): void {
    this.comentarioAnteriorSubject.next(value);
  }

  setHistoriaClinica(value: string): void {
    this.historiaClinicaSubject.next(value);
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
    PERIO_TOOTH_IDS.forEach(id => map.set(id, this.makeEmptyPerioTooth(id)));
    this.perioTeethSubject.next(map);
  }

  private normalizeOdontoEstado(estado?: OdontogramaEstadoActual | null): OdontogramaEstadoActual {
    return {
      caras: estado?.caras ?? [],
      leyendas: estado?.leyendas ?? []
    };
  }

  private normalizePerioEstado(estado?: PeriodontogramaEstadoActual | null): PeriodontogramaEstadoActual {
    return {
      dientes: estado?.dientes ?? []
    };
  }

  private emptyOdontoResponse(appointmentId: string): OdontogramaResponse {
    return {
      appointmentId,
      patientId: '',
      estadoActual: { caras: [], leyendas: [] },
      cambiosTurno: { caras: [], leyendas: [] }
    };
  }

  private emptyPerioResponse(appointmentId: string): PeriodontogramaResponse {
    return {
      appointmentId,
      patientId: '',
      estadoActual: { dientes: [] },
      cambiosTurno: { dientes: [] }
    };
  }

  private mergeOdontoEstado(
    estadoActual: OdontogramaEstadoActual,
    cambiosTurno: OdontogramaEstadoActual
  ): OdontogramaEstadoActual {
    const carasMap = new Map<string, CaraDelta>();
    for (const c of estadoActual?.caras ?? []) {
      carasMap.set(`${c.numeroDiente}-${c.cara}`, c);
    }
    for (const c of cambiosTurno?.caras ?? []) {
      carasMap.set(`${c.numeroDiente}-${c.cara}`, c);
    }

    const leyendasMap = new Map<number, LeyendaDelta>();
    for (const l of estadoActual?.leyendas ?? []) {
      leyendasMap.set(l.numeroDiente, { ...l });
    }
    for (const l of cambiosTurno?.leyendas ?? []) {
      const existing = leyendasMap.get(l.numeroDiente);
      if (!existing) {
        leyendasMap.set(l.numeroDiente, { ...l });
      } else {
        // OR de campos booleanos, ultimo no-nulo para movilidad/furca
        existing.ausencia = existing.ausencia || l.ausencia || false;
        existing.implante = existing.implante || l.implante || false;
        existing.corona = existing.corona || l.corona || false;
        existing.puente = existing.puente || l.puente || false;
        existing.erupcion = existing.erupcion || l.erupcion || false;
        existing.retencion = existing.retencion || l.retencion || false;
        existing.impactado = existing.impactado || l.impactado || false;
        existing.extraer = existing.extraer || l.extraer || false;
        existing.endodoncia = existing.endodoncia || l.endodoncia || false;
        existing.fractura = existing.fractura || l.fractura || false;
        existing.lesion = existing.lesion || l.lesion || false;
        existing['dolor_sensibilidad'] = existing['dolor_sensibilidad'] || l['dolor_sensibilidad'] || false;
        existing.ausente = existing.ausente || l.ausente || false;
        existing.movilidad = l.movilidad != null ? l.movilidad : existing.movilidad;
        existing.furca = l.furca != null ? l.furca : existing.furca;
      }
    }

    return {
      caras: Array.from(carasMap.values()),
      leyendas: Array.from(leyendasMap.values())
    };
  }

  private mergePerioEstado(
    estadoActual: PeriodontogramaEstadoActual,
    cambiosTurno: PeriodontogramaEstadoActual
  ): PeriodontogramaEstadoActual {
    const map = new Map<number, PeriodontogramaDienteDelta>();
    for (const d of estadoActual?.dientes ?? []) {
      map.set(d.numeroDiente, { ...d });
    }
    for (const d of cambiosTurno?.dientes ?? []) {
      const existing = map.get(d.numeroDiente) ?? { numeroDiente: d.numeroDiente };
      map.set(d.numeroDiente, { ...existing, ...d });
    }
    return { dientes: Array.from(map.values()) };
  }

  private applyOdontoState(state: OdontogramaEstadoActual): void {
    const facesMap = new Map<number, Record<FaceKey, EstadoCara>>();
    ALL_ODONTO_TOOTH_IDS.forEach(id => facesMap.set(id, this.emptyFaces()));

    for (const cara of state.caras ?? []) {
      const faceKey = this.caraToFaceKey(cara.cara);
      if (!faceKey) {
        continue;
      }
      const toothFaces = facesMap.get(cara.numeroDiente) ?? this.emptyFaces();
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
    PERIO_TOOTH_IDS.forEach(id => map.set(id, this.makeEmptyPerioTooth(id)));

    for (const d of state.dientes ?? []) {
      map.set(d.numeroDiente, this.dienteDeltaToTooth(d));
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
        return this.leyendaHasData(l);
      }
      return this.leyendaChanged(baseline, l);
    });

    if (pago) {
      delta.pago = pago;
    }

    return delta;
  }

  private leyendaHasData(l: LeyendaDelta): boolean {
    return !!(l.ausencia || l.implante || l.corona || l.puente || l.erupcion ||
              l.retencion || l.impactado || l.extraer || l.endodoncia ||
              l.fractura || l.lesion || l['dolor_sensibilidad'] ||
              l.ausente || l.movilidad != null || l.furca != null);
  }

  private leyendaChanged(baseline: LeyendaDelta, current: LeyendaDelta): boolean {
    return (baseline.ausencia ?? false) !== (current.ausencia ?? false) ||
           (baseline.implante ?? false) !== (current.implante ?? false) ||
           (baseline.corona ?? false) !== (current.corona ?? false) ||
           (baseline.puente ?? false) !== (current.puente ?? false) ||
           (baseline.erupcion ?? false) !== (current.erupcion ?? false) ||
           (baseline.retencion ?? false) !== (current.retencion ?? false) ||
           (baseline.impactado ?? false) !== (current.impactado ?? false) ||
           (baseline.extraer ?? false) !== (current.extraer ?? false) ||
           (baseline.endodoncia ?? false) !== (current.endodoncia ?? false) ||
           (baseline.fractura ?? false) !== (current.fractura ?? false) ||
           (baseline.lesion ?? false) !== (current.lesion ?? false) ||
           (baseline['dolor_sensibilidad'] ?? false) !== (current['dolor_sensibilidad'] ?? false) ||
           (baseline.ausente ?? false) !== (current.ausente ?? false) ||
           baseline.movilidad !== current.movilidad ||
           baseline.furca !== current.furca;
  }

  private buildPeriodontogramDelta(): PeriodontogramaDeltaRequest {
    const changed: PeriodontogramaDienteDelta[] = [];

    for (const tooth of this.perioTeethSubject.value.values()) {
      const current = this.toothToDelta(tooth);
      const baseline = this.baselinePerio.dientes.find(d => d.numeroDiente === tooth.id);
      if (!baseline) {
        if (this.hasPerioData(current)) {
          changed.push(current);
        }
      } else if (!this.dienteDeltaEquals(current, baseline)) {
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

  private toothToDelta(tooth: PerioToothMvp): PeriodontogramaDienteDelta {
    const v = tooth.vestibular;
    const l = tooth.lingual;
    return {
      numeroDiente: tooth.id,
      mobility: tooth.mobility,
      furcation: tooth.furcation,
      vestPsM: v.probing[0], vestPsC: v.probing[1], vestPsD: v.probing[2],
      vestMgM: v.mg[0], vestMgC: v.mg[1], vestMgD: v.mg[2],
      vestSangradoM: v.bleeding[0], vestSangradoC: v.bleeding[1], vestSangradoD: v.bleeding[2],
      vestPlacaM: v.plaque[0], vestPlacaC: v.plaque[1], vestPlacaD: v.plaque[2],
      vestSupuracionM: v.suppuration[0], vestSupuracionC: v.suppuration[1], vestSupuracionD: v.suppuration[2],
      vestCalculoM: v.calculus[0], vestCalculoC: v.calculus[1], vestCalculoD: v.calculus[2],
      lingPsM: l.probing[0], lingPsC: l.probing[1], lingPsD: l.probing[2],
      lingMgM: l.mg[0], lingMgC: l.mg[1], lingMgD: l.mg[2],
      lingSangradoM: l.bleeding[0], lingSangradoC: l.bleeding[1], lingSangradoD: l.bleeding[2],
      lingPlacaM: l.plaque[0], lingPlacaC: l.plaque[1], lingPlacaD: l.plaque[2],
      lingSupuracionM: l.suppuration[0], lingSupuracionC: l.suppuration[1], lingSupuracionD: l.suppuration[2],
      lingCalculoM: l.calculus[0], lingCalculoC: l.calculus[1], lingCalculoD: l.calculus[2]
    };
  }

  private dienteDeltaToTooth(d: PeriodontogramaDienteDelta): PerioToothMvp {
    return {
      id: d.numeroDiente,
      present: true,
      mobility: d.mobility ?? 0,
      furcation: d.furcation ?? 0,
      vestibular: this.deltaToFace(d, 'vest'),
      lingual: this.deltaToFace(d, 'ling')
    };
  }

  private deltaToFace(d: PeriodontogramaDienteDelta, prefix: 'vest' | 'ling'): PerioFaceMvp {
    const ps = prefix === 'vest'
      ? [d.vestPsM ?? 0, d.vestPsC ?? 0, d.vestPsD ?? 0]
      : [d.lingPsM ?? 0, d.lingPsC ?? 0, d.lingPsD ?? 0];
    const mg = prefix === 'vest'
      ? [d.vestMgM ?? 0, d.vestMgC ?? 0, d.vestMgD ?? 0]
      : [d.lingMgM ?? 0, d.lingMgC ?? 0, d.lingMgD ?? 0];
    const bleeding = prefix === 'vest'
      ? [d.vestSangradoM ?? false, d.vestSangradoC ?? false, d.vestSangradoD ?? false]
      : [d.lingSangradoM ?? false, d.lingSangradoC ?? false, d.lingSangradoD ?? false];
    const plaque = prefix === 'vest'
      ? [d.vestPlacaM ?? false, d.vestPlacaC ?? false, d.vestPlacaD ?? false]
      : [d.lingPlacaM ?? false, d.lingPlacaC ?? false, d.lingPlacaD ?? false];
    const suppuration = prefix === 'vest'
      ? [d.vestSupuracionM ?? false, d.vestSupuracionC ?? false, d.vestSupuracionD ?? false]
      : [d.lingSupuracionM ?? false, d.lingSupuracionC ?? false, d.lingSupuracionD ?? false];
    const calculus = prefix === 'vest'
      ? [d.vestCalculoM ?? false, d.vestCalculoC ?? false, d.vestCalculoD ?? false]
      : [d.lingCalculoM ?? false, d.lingCalculoC ?? false, d.lingCalculoD ?? false];

    return {
      probing: [ps[0], ps[1], ps[2]] as [number, number, number],
      mg: [mg[0], mg[1], mg[2]] as [number, number, number],
      bleeding: [bleeding[0], bleeding[1], bleeding[2]] as [boolean, boolean, boolean],
      plaque: [plaque[0], plaque[1], plaque[2]] as [boolean, boolean, boolean],
      suppuration: [suppuration[0], suppuration[1], suppuration[2]] as [boolean, boolean, boolean],
      calculus: [calculus[0], calculus[1], calculus[2]] as [boolean, boolean, boolean]
    };
  }

  private dienteDeltaEquals(a: PeriodontogramaDienteDelta, b: PeriodontogramaDienteDelta): boolean {
    const fields: (keyof PeriodontogramaDienteDelta)[] = [
      'mobility', 'furcation',
      'vestPsM', 'vestPsC', 'vestPsD', 'vestMgM', 'vestMgC', 'vestMgD',
      'vestSangradoM', 'vestSangradoC', 'vestSangradoD',
      'vestPlacaM', 'vestPlacaC', 'vestPlacaD',
      'vestSupuracionM', 'vestSupuracionC', 'vestSupuracionD',
      'vestCalculoM', 'vestCalculoC', 'vestCalculoD',
      'lingPsM', 'lingPsC', 'lingPsD', 'lingMgM', 'lingMgC', 'lingMgD',
      'lingSangradoM', 'lingSangradoC', 'lingSangradoD',
      'lingPlacaM', 'lingPlacaC', 'lingPlacaD',
      'lingSupuracionM', 'lingSupuracionC', 'lingSupuracionD',
      'lingCalculoM', 'lingCalculoC', 'lingCalculoD'
    ];
    return fields.every(f => (a[f] ?? (typeof a[f] === 'boolean' ? false : 0)) === (b[f] ?? (typeof b[f] === 'boolean' ? false : 0)));
  }

  private hasPerioData(d: PeriodontogramaDienteDelta): boolean {
    return this.dienteDeltaEquals(d, { numeroDiente: d.numeroDiente, mobility: 0, furcation: 0 }) === false;
  }

  private makeEmptyPerioTooth(id: number): PerioToothMvp {
    return {
      id,
      present: true,
      mobility: 0,
      furcation: 0,
      vestibular: this.emptyPerioFace(),
      lingual: this.emptyPerioFace()
    };
  }

  private emptyPerioFace(): PerioFaceMvp {
    return {
      probing: [0, 0, 0],
      mg: [0, 0, 0],
      bleeding: [false, false, false],
      plaque: [false, false, false],
      suppuration: [false, false, false],
      calculus: [false, false, false]
    };
  }

  private emptyFaces(): Record<FaceKey, EstadoCara> {
    return { top: 'normal', right: 'normal', center: 'normal', left: 'normal', bottom: 'normal' };
  }

  private nextFaceState(current: EstadoCara): EstadoCara {
    switch (current) {
      case 'normal': return 'caries';
      case 'caries': return 'obturacion';
      case 'obturacion': return 'ausente';
      default: return 'normal';
    }
  }

  private caraToFaceKey(cara: string): FaceKey | null {
    const map: Record<string, FaceKey> = {
      arriba: 'top', derecha: 'right', centro: 'center', izquierda: 'left', abajo: 'bottom'
    };
    return map[cara] ?? null;
  }

  private cloneOdontoEstado(state: OdontogramaEstadoActual): OdontogramaEstadoActual {
    return {
      caras: (state.caras ?? []).map(c => ({ ...c })),
      leyendas: (state.leyendas ?? []).map(l => ({ ...l }))
    };
  }

  private clonePerioEstado(state: PeriodontogramaEstadoActual): PeriodontogramaEstadoActual {
    return { dientes: (state.dientes ?? []).map(d => ({ ...d })) };
  }
}
