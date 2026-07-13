import {
  PerioFaceMvp,
  PerioToothMvp,
  PeriodontogramaDienteDelta,
  PeriodontogramaEstadoActual,
  PeriodontogramaResponse
} from '../../../core/models/periodontograma.model';

export function normalizePerioEstado(estado?: PeriodontogramaEstadoActual | null): PeriodontogramaEstadoActual {
  return {
    dientes: estado?.dientes ?? []
  };
}

export function emptyPerioResponse(appointmentId: string): PeriodontogramaResponse {
  return {
    appointmentId,
    patientId: '',
    estadoActual: { dientes: [] },
    cambiosTurno: { dientes: [] }
  };
}

export function mergePerioEstado(
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

export function toothToDelta(tooth: PerioToothMvp): PeriodontogramaDienteDelta {
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

export function deltaToFace(d: PeriodontogramaDienteDelta, prefix: 'vest' | 'ling'): PerioFaceMvp {
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

export function dienteDeltaToTooth(d: PeriodontogramaDienteDelta): PerioToothMvp {
  return {
    id: d.numeroDiente,
    present: true,
    mobility: d.mobility ?? 0,
    furcation: d.furcation ?? 0,
    vestibular: deltaToFace(d, 'vest'),
    lingual: deltaToFace(d, 'ling')
  };
}

export function dienteDeltaEquals(a: PeriodontogramaDienteDelta, b: PeriodontogramaDienteDelta): boolean {
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

export function hasPerioData(d: PeriodontogramaDienteDelta): boolean {
  return dienteDeltaEquals(d, { numeroDiente: d.numeroDiente, mobility: 0, furcation: 0 }) === false;
}

export function makeEmptyPerioTooth(id: number): PerioToothMvp {
  return {
    id,
    present: true,
    mobility: 0,
    furcation: 0,
    vestibular: emptyPerioFace(),
    lingual: emptyPerioFace()
  };
}

export function emptyPerioFace(): PerioFaceMvp {
  return {
    probing: [0, 0, 0],
    mg: [0, 0, 0],
    bleeding: [false, false, false],
    plaque: [false, false, false],
    suppuration: [false, false, false],
    calculus: [false, false, false]
  };
}

export function clonePerioEstado(state: PeriodontogramaEstadoActual): PeriodontogramaEstadoActual {
  return { dientes: (state.dientes ?? []).map(d => ({ ...d })) };
}
