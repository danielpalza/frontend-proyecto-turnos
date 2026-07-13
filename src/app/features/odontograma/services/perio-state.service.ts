import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  PeriodontogramaDeltaRequest,
  PeriodontogramaDienteDelta,
  PeriodontogramaEstadoActual,
  PeriodontogramaResponse,
  PerioToothMvp
} from '../../../core/models/periodontograma.model';
import {
  normalizePerioEstado,
  mergePerioEstado,
  toothToDelta,
  dienteDeltaToTooth,
  dienteDeltaEquals,
  hasPerioData,
  makeEmptyPerioTooth,
  clonePerioEstado
} from './perio-delta.util';

const PERIO_TOOTH_IDS = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
];

@Injectable({ providedIn: 'root' })
export class PerioStateService {
  private readonly perioTeethSubject = new BehaviorSubject<Map<number, PerioToothMvp>>(new Map());
  readonly perioTeeth$ = this.perioTeethSubject.asObservable();

  private baselinePerio: PeriodontogramaEstadoActual = { dientes: [] };

  constructor() {
    this.initEmptyPerioMap();
  }

  /** Aplica la respuesta de carga inicial (merge estadoActual+cambiosTurno, re-baseline, proyección al Subject). */
  loadPerio(perio: PeriodontogramaResponse): void {
    const merged = mergePerioEstado(
      normalizePerioEstado(perio.estadoActual),
      normalizePerioEstado(perio.cambiosTurno)
    );
    this.baselinePerio = clonePerioEstado(merged);
    this.applyPerioState(merged);
  }

  /** Aplica la respuesta de guardado (re-baseline tras un save exitoso). */
  applySaveResponse(response: PeriodontogramaResponse): void {
    const merged = mergePerioEstado(response.estadoActual, response.cambiosTurno);
    this.baselinePerio = clonePerioEstado(merged);
    this.applyPerioState(merged);
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

  private applyPerioState(state: PeriodontogramaEstadoActual): void {
    const map = new Map<number, PerioToothMvp>();
    PERIO_TOOTH_IDS.forEach(id => map.set(id, makeEmptyPerioTooth(id)));

    for (const d of state.dientes ?? []) {
      map.set(d.numeroDiente, dienteDeltaToTooth(d));
    }
    this.perioTeethSubject.next(map);
  }

  buildPeriodontogramDelta(): PeriodontogramaDeltaRequest {
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
}
