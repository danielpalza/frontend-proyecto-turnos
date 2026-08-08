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

describe('mergePerioEstado', () => {
  it('sobreescribe por spread plano: cambiosTurno gana campo a campo (a diferencia de mergeOdontoEstado)', () => {
    const merged = mergePerioEstado(
      { dientes: [{ numeroDiente: 11, mobility: 1, vestSangradoM: true }] },
      { dientes: [{ numeroDiente: 11, mobility: 2 }] }
    );
    expect(merged.dientes[0].mobility).toBe(2);
    // El spread no toca vestSangradoM porque cambiosTurno no lo trae: sobrevive del lado existente.
    expect(merged.dientes[0].vestSangradoM).toBe(true);
  });
});

describe('toothToDelta / dienteDeltaToTooth (ida y vuelta)', () => {
  it('un diente vacío sobrevive al round-trip sin cambios', () => {
    const tooth = makeEmptyPerioTooth(11);
    const roundTripped = dienteDeltaToTooth(toothToDelta(tooth));
    expect(roundTripped).toEqual(tooth);
  });

  it('un diente con datos sobrevive al round-trip', () => {
    const tooth = makeEmptyPerioTooth(11);
    tooth.mobility = 2;
    tooth.vestibular.probing = [3, 4, 5];
    tooth.vestibular.bleeding = [true, false, true];

    const roundTripped = dienteDeltaToTooth(toothToDelta(tooth));

    expect(roundTripped.mobility).toBe(2);
    expect(roundTripped.vestibular.probing).toEqual([3, 4, 5]);
    expect(roundTripped.vestibular.bleeding).toEqual([true, false, true]);
  });
});

describe('dienteDeltaEquals', () => {
  it('dos dientes completos e iguales: equals true', () => {
    const a = toothToDelta(makeEmptyPerioTooth(11));
    const b = toothToDelta(makeEmptyPerioTooth(11));
    expect(dienteDeltaEquals(a, b)).toBe(true);
  });

  it('una diferencia en un campo: equals false', () => {
    const a = toothToDelta(makeEmptyPerioTooth(11));
    const b = { ...a, mobility: 3 };
    expect(dienteDeltaEquals(a, b)).toBe(false);
  });
});

describe('hasPerioData — ver DEUDA_TECNICA.md § 5 (bug real encontrado escribiendo el Tier 2)', () => {
  it('un diente con datos reales da true', () => {
    const tooth = makeEmptyPerioTooth(11);
    tooth.mobility = 2;
    expect(hasPerioData(toothToDelta(tooth))).toBe(true);
  });

  it('BUG conocido: un diente completamente vacío TAMBIÉN da true (debería dar false) — no se corrige acá', () => {
    const empty = toothToDelta(makeEmptyPerioTooth(11));
    expect(hasPerioData(empty)).toBe(true);
  });
});

describe('clonePerioEstado', () => {
  it('clona en profundidad (no comparte referencias)', () => {
    const original = { dientes: [{ numeroDiente: 11, mobility: 1 }] };
    const clone = clonePerioEstado(original);
    clone.dientes[0].mobility = 5;
    expect(original.dientes[0].mobility).toBe(1);
  });
});

describe('normalizePerioEstado / emptyPerioResponse', () => {
  it('normalizePerioEstado con null da dientes vacío', () => {
    expect(normalizePerioEstado(null)).toEqual({ dientes: [] });
  });

  it('emptyPerioResponse arma una respuesta vacía con el appointmentId dado', () => {
    expect(emptyPerioResponse('apt-1').appointmentId).toBe('apt-1');
  });
});
