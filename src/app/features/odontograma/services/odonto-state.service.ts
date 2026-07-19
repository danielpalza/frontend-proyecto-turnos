import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
  VALOR_TO_LEYENDA_LABEL
} from '../../../core/models/odontograma.model';
import {
  normalizeOdontoEstado,
  mergeOdontoEstado,
  leyendaHasData,
  leyendaChanged,
  cloneOdontoEstado,
  emptyFaces,
  nextFaceState,
  caraToFaceKey
} from './odonto-delta.util';

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
  Ausencia: 'ausencia',
  Implante: 'implante',
  Corona: 'corona',
  Puente: 'puente',
  'Retención': 'retencion',
  Erupcion: 'erupcion',
  Impactado: 'impactado',
  Extraer: 'extraer',
  Endodoncia: 'endodoncia',
  Fractura: 'fractura',
  Lesion: 'lesion',
  'Dolor/Sensibilidad': 'dolor-sensibilidad',
  M0: 'bi bi-0-circle-fill',
  M1: 'm1',
  M2: 'm2',
  M3: 'm3',
  F0: 'bi bi-0-square-fill',
  F1: 'f1',
  F2: 'f2',
  F3: 'f3'
};

const MOBILITY_LABELS = ['M0', 'M1', 'M2', 'M3'];
const FURCA_LABELS = ['F0', 'F1', 'F2', 'F3'];

@Injectable({ providedIn: 'root' })
export class OdontoStateService {
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

  private baselineOdonto: OdontogramaEstadoActual = { caras: [], leyendas: [] };
  private baselineComentario = '';
  private baselinePlanTratamiento = '';

  /** Aplica la respuesta de carga inicial (merge estadoActual+cambiosTurno, re-baseline, proyección a Subjects). */
  loadOdonto(odonto: OdontogramaResponse): void {
    const merged = mergeOdontoEstado(
      normalizeOdontoEstado(odonto.estadoActual),
      normalizeOdontoEstado(odonto.cambiosTurno)
    );
    this.baselineOdonto = cloneOdontoEstado(merged);
    this.baselineComentario = odonto.comentario ?? '';
    this.baselinePlanTratamiento = odonto.planTratamiento ?? '';
    this.applyOdontoState(merged);
    this.comentarioSubject.next(odonto.comentario ?? '');
    this.planTratamientoSubject.next(odonto.planTratamiento ?? '');
    this.comentarioAnteriorSubject.next(odonto.comentarioAnterior ?? '');
  }

  /** Aplica la respuesta de guardado (re-baseline tras un save exitoso). */
  applySaveResponse(response: OdontogramaResponse): void {
    const merged = mergeOdontoEstado(response.estadoActual, response.cambiosTurno);
    this.baselineOdonto = cloneOdontoEstado(merged);
    this.baselineComentario = response.comentario ?? '';
    this.baselinePlanTratamiento = response.planTratamiento ?? '';
    this.applyOdontoState(merged);
    this.comentarioSubject.next(response.comentario ?? '');
    this.planTratamientoSubject.next(response.planTratamiento ?? '');
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

  buildOdontogramDelta(pago?: OdontogramaPagoDelta): OdontogramaDeltaRequest {
    const current = this.snapshotCurrentOdonto();
    const delta: OdontogramaDeltaRequest = {};

    const comentario = this.comentarioSubject.value;
    const plan = this.planTratamientoSubject.value;
    if (comentario !== this.baselineComentario) {
      delta.comentario = comentario;
    }
    if (plan !== this.baselinePlanTratamiento) {
      delta.planTratamiento = plan;
    }

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

  private snapshotCurrentOdonto(): OdontogramaEstadoActual {
    const caras: CaraDelta[] = [];
    this.facesSubject.value.forEach((faces, numeroDiente) => {
      (Object.keys(faces) as FaceKey[]).forEach(faceKey => {
        const estado = faces[faceKey];
        const cara = FACE_KEY_TO_CARA[faceKey];
        const baselineEstado = this.baselineOdonto.caras.find(
          b => b.numeroDiente === numeroDiente && b.cara === cara
        )?.estado ?? 'normal';
        // Incluir también reversiones a 'normal' cuando el baseline no era 'normal',
        // si no, buildOdontogramDelta nunca puede detectar/guardar esa corrección.
        if (estado !== 'normal' || baselineEstado !== 'normal') {
          caras.push({ numeroDiente, cara, estado });
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
