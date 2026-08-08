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

describe('normalizeOdontoEstado', () => {
  it('null/undefined da caras y leyendas vacías', () => {
    expect(normalizeOdontoEstado(null)).toEqual({ caras: [], leyendas: [] });
    expect(normalizeOdontoEstado(undefined)).toEqual({ caras: [], leyendas: [] });
  });
});

describe('emptyOdontoResponse', () => {
  it('arma una respuesta vacía con el appointmentId dado', () => {
    const r = emptyOdontoResponse('apt-1');
    expect(r.appointmentId).toBe('apt-1');
    expect(r.estadoActual).toEqual({ caras: [], leyendas: [] });
  });
});

describe('mergeOdontoEstado', () => {
  it('caras: sobreescritura total por clave numeroDiente-cara (último gana)', () => {
    const merged = mergeOdontoEstado(
      { caras: [{ numeroDiente: 11, cara: 'arriba', estado: 'caries' }], leyendas: [] },
      { caras: [{ numeroDiente: 11, cara: 'arriba', estado: 'normal' }], leyendas: [] }
    );
    expect(merged.caras).toEqual([{ numeroDiente: 11, cara: 'arriba', estado: 'normal' }]);
  });

  it('leyendas: un flag booleano en true en estadoActual sobrevive aunque cambiosTurno lo traiga en false (OR)', () => {
    const merged = mergeOdontoEstado(
      { caras: [], leyendas: [{ numeroDiente: 11, corona: true }] },
      { caras: [], leyendas: [{ numeroDiente: 11, corona: false }] }
    );
    expect(merged.leyendas[0].corona).toBe(true);
  });

  it('leyendas: movilidad/furca usan último-no-nulo (numéricos sí se sobreescriben)', () => {
    const merged = mergeOdontoEstado(
      { caras: [], leyendas: [{ numeroDiente: 11, movilidad: 1 }] },
      { caras: [], leyendas: [{ numeroDiente: 11, movilidad: 3 }] }
    );
    expect(merged.leyendas[0].movilidad).toBe(3);
  });

  it('leyendas: si cambiosTurno no trae movilidad, se conserva la de estadoActual', () => {
    const merged = mergeOdontoEstado(
      { caras: [], leyendas: [{ numeroDiente: 11, movilidad: 2 }] },
      { caras: [], leyendas: [{ numeroDiente: 11 }] }
    );
    expect(merged.leyendas[0].movilidad).toBe(2);
  });
});

describe('nextFaceState', () => {
  it('cicla normal → caries → obturacion → ausente → normal', () => {
    expect(nextFaceState('normal')).toBe('caries');
    expect(nextFaceState('caries')).toBe('obturacion');
    expect(nextFaceState('obturacion')).toBe('ausente');
    expect(nextFaceState('ausente')).toBe('normal');
  });
});

describe('caraToFaceKey', () => {
  it('mapea las 5 posiciones en español a FaceKey', () => {
    expect(caraToFaceKey('arriba')).toBe('top');
    expect(caraToFaceKey('derecha')).toBe('right');
    expect(caraToFaceKey('centro')).toBe('center');
    expect(caraToFaceKey('izquierda')).toBe('left');
    expect(caraToFaceKey('abajo')).toBe('bottom');
  });

  it('un valor no mapeado devuelve null (no lanza) — riesgo real si el backend manda un valor nuevo', () => {
    expect(caraToFaceKey('valor-inventado')).toBeNull();
  });
});

describe('leyendaHasData', () => {
  it('todo en false/null: sin datos', () => {
    expect(leyendaHasData({ numeroDiente: 11 })).toBe(false);
  });

  it('movilidad: 0 SÍ cuenta como con datos (chequea != null, no truthy)', () => {
    expect(leyendaHasData({ numeroDiente: 11, movilidad: 0 })).toBe(true);
  });

  it('un flag booleano en true cuenta como con datos', () => {
    expect(leyendaHasData({ numeroDiente: 11, corona: true })).toBe(true);
  });
});

describe('leyendaChanged', () => {
  it('sin diferencias: false', () => {
    expect(leyendaChanged({ numeroDiente: 11, corona: true }, { numeroDiente: 11, corona: true })).toBe(false);
  });

  it('con una diferencia: true', () => {
    expect(leyendaChanged({ numeroDiente: 11, corona: true }, { numeroDiente: 11, corona: false })).toBe(true);
  });
});

describe('cloneOdontoEstado / emptyFaces', () => {
  it('clona en profundidad (no comparte referencias con el original)', () => {
    const original = { caras: [{ numeroDiente: 11, cara: 'arriba' as const, estado: 'caries' as const }], leyendas: [] };
    const clone = cloneOdontoEstado(original);
    clone.caras[0].estado = 'normal';
    expect(original.caras[0].estado).toBe('caries');
  });

  it('emptyFaces da las 5 caras en normal', () => {
    expect(emptyFaces()).toEqual({ top: 'normal', right: 'normal', center: 'normal', left: 'normal', bottom: 'normal' });
  });
});
