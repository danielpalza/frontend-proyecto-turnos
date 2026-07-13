import {
  CaraDelta,
  EstadoCara,
  FaceKey,
  LeyendaDelta,
  OdontogramaEstadoActual,
  OdontogramaResponse
} from '../../../core/models/odontograma.model';

export function normalizeOdontoEstado(estado?: OdontogramaEstadoActual | null): OdontogramaEstadoActual {
  return {
    caras: estado?.caras ?? [],
    leyendas: estado?.leyendas ?? []
  };
}

export function emptyOdontoResponse(appointmentId: string): OdontogramaResponse {
  return {
    appointmentId,
    patientId: '',
    estadoActual: { caras: [], leyendas: [] },
    cambiosTurno: { caras: [], leyendas: [] }
  };
}

export function mergeOdontoEstado(
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

export function leyendaHasData(l: LeyendaDelta): boolean {
  return !!(l.ausencia || l.implante || l.corona || l.puente || l.erupcion ||
            l.retencion || l.impactado || l.extraer || l.endodoncia ||
            l.fractura || l.lesion || l['dolor_sensibilidad'] ||
            l.ausente || l.movilidad != null || l.furca != null);
}

export function leyendaChanged(baseline: LeyendaDelta, current: LeyendaDelta): boolean {
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

export function cloneOdontoEstado(state: OdontogramaEstadoActual): OdontogramaEstadoActual {
  return {
    caras: (state.caras ?? []).map(c => ({ ...c })),
    leyendas: (state.leyendas ?? []).map(l => ({ ...l }))
  };
}

export function emptyFaces(): Record<FaceKey, EstadoCara> {
  return { top: 'normal', right: 'normal', center: 'normal', left: 'normal', bottom: 'normal' };
}

export function nextFaceState(current: EstadoCara): EstadoCara {
  switch (current) {
    case 'normal': return 'caries';
    case 'caries': return 'obturacion';
    case 'obturacion': return 'ausente';
    default: return 'normal';
  }
}

export function caraToFaceKey(cara: string): FaceKey | null {
  const map: Record<string, FaceKey> = {
    arriba: 'top', derecha: 'right', centro: 'center', izquierda: 'left', abajo: 'bottom'
  };
  return map[cara] ?? null;
}
