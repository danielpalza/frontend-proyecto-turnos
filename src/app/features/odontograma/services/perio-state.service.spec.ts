import { TestBed } from '@angular/core/testing';
import { PerioStateService } from './perio-state.service';
import { PeriodontogramaResponse } from '../../../core/models/periodontograma.model';
import { makeEmptyPerioTooth, toothToDelta } from './perio-delta.util';

function emptyPerio(overrides: Partial<PeriodontogramaResponse> = {}): PeriodontogramaResponse {
  return {
    appointmentId: 'apt-1',
    patientId: 'p-1',
    estadoActual: { dientes: [] },
    cambiosTurno: { dientes: [] },
    ...overrides
  };
}

function currentValue<T>(obs: { subscribe: (fn: (v: T) => void) => void }): T {
  let value!: T;
  obs.subscribe(v => (value = v));
  return value;
}

describe('PerioStateService', () => {
  let service: PerioStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerioStateService);
  });

  it('el constructor pre-siembra los 32 dientes permanentes, sin necesidad de loadPerio()', () => {
    expect(service.getPerioTeethMap().size).toBe(32);
    expect(service.getPerioTeethMap().get(11)).toMatchObject({ id: 11, present: true, mobility: 0 });
  });

  it('loadPerio con editable: false vuelve no-op a updatePerioTooth', () => {
    service.loadPerio(emptyPerio({ editable: false }));
    expect(service.isEditable).toBe(false);

    service.updatePerioTooth(11, tooth => (tooth.mobility = 2));
    expect(service.getPerioTeethMap().get(11)?.mobility).toBe(0);
  });

  it('updatePerioTooth con un id fuera del mapa: no-op, no lanza', () => {
    service.loadPerio(emptyPerio());
    expect(() => service.updatePerioTooth(99, tooth => (tooth.mobility = 3))).not.toThrow();
  });

  it('mutar un diente in-place NO dispara perioTeeth$ por sí solo; notifyPerioChange() sí', () => {
    service.loadPerio(emptyPerio());

    let emissions = 0;
    service.perioTeeth$.subscribe(() => emissions++);
    const initialEmissions = emissions;

    // Mutación in-place directa (simula lo que hace un consumidor con el objeto de la referencia)
    const tooth = service.getPerioTeethMap().get(11)!;
    tooth.mobility = 2;
    expect(emissions).toBe(initialEmissions);

    service.notifyPerioChange();
    expect(emissions).toBe(initialEmissions + 1);
    expect(currentValue(service.perioTeeth$).get(11)?.mobility).toBe(2);
  });

  it('updatePerioTooth SÍ dispara la emisión (usa next internamente)', () => {
    service.loadPerio(emptyPerio());
    let lastMap = service.getPerioTeethMap();
    service.perioTeeth$.subscribe(map => (lastMap = map));

    service.updatePerioTooth(11, tooth => (tooth.mobility = 1));
    expect(lastMap.get(11)?.mobility).toBe(1);
  });

  describe('buildPeriodontogramDelta()', () => {
    it('un diente con baseline COMPLETO e igual al actual no entra en el delta (comparación campo a campo)', () => {
      const baselineTooth11 = toothToDelta(makeEmptyPerioTooth(11));
      service.loadPerio(emptyPerio({ estadoActual: { dientes: [baselineTooth11] } }));

      const delta = service.buildPeriodontogramDelta();
      expect((delta.dientes ?? []).some(d => d.numeroDiente === 11)).toBe(false);
    });

    it('un diente con baseline completo que cambió entra en el delta', () => {
      const baselineTooth11 = toothToDelta(makeEmptyPerioTooth(11));
      service.loadPerio(emptyPerio({ estadoActual: { dientes: [baselineTooth11] } }));

      service.updatePerioTooth(11, tooth => (tooth.mobility = 2));

      const delta = service.buildPeriodontogramDelta();
      const entry = (delta.dientes ?? []).find(d => d.numeroDiente === 11);
      expect(entry?.mobility).toBe(2);
    });

    it('un diente sin ninguna entrada de baseline entra en el delta apenas tiene datos reales', () => {
      service.loadPerio(emptyPerio()); // sin baseline para ningún diente
      service.updatePerioTooth(11, tooth => (tooth.mobility = 2));

      const delta = service.buildPeriodontogramDelta();
      expect((delta.dientes ?? []).some(d => d.numeroDiente === 11 && d.mobility === 2)).toBe(true);
    });

    /**
     * BUG real encontrado al escribir este spec (no un caso ideal inventado), ver
     * DEUDA_TECNICA.md § 5: `hasPerioData()` compara contra un objeto parcial
     * (`{ numeroDiente, mobility: 0, furcation: 0 }`, sin los otros 34 campos). Para esos campos
     * ausentes, `dienteDeltaEquals` cae a `0` como default en vez de `false` (el fallback decide por
     * `typeof` del lado que falta, no por el tipo real del campo) — así que un diente vacío de
     * verdad (`false` en sus 24 campos booleanos) nunca resulta "igual" al objeto de comparación
     * (`false !== 0`), y `hasPerioData` da `true` para cualquier diente sin baseline, tenga datos o
     * no. Efecto real: **todo diente sin baseline previo viaja en el delta de guardado aunque esté
     * completamente vacío** — no se corrige acá, solo se fija el comportamiento actual.
     */
    it('BUG conocido: sin ningún baseline, los 32 dientes vacíos igual entran al delta (deberían ser 0)', () => {
      service.loadPerio(emptyPerio());

      const delta = service.buildPeriodontogramDelta();

      expect(delta.dientes).toHaveLength(32);
    });
  });

  describe('applySaveResponse()', () => {
    it('re-baselinea tras un guardado exitoso: el mismo valor guardado ya no aparece como cambio', () => {
      const baselineTooth11 = toothToDelta(makeEmptyPerioTooth(11));
      service.loadPerio(emptyPerio({ estadoActual: { dientes: [baselineTooth11] } }));
      service.updatePerioTooth(11, tooth => (tooth.mobility = 2));

      service.applySaveResponse(emptyPerio({
        estadoActual: { dientes: [{ ...baselineTooth11, mobility: 2 }] }
      }));

      const delta = service.buildPeriodontogramDelta();
      expect(delta.dientes?.some(d => d.numeroDiente === 11)).toBe(false);
    });
  });
});
