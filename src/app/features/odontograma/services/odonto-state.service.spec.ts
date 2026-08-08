import { TestBed } from '@angular/core/testing';
import { OdontoStateService } from './odonto-state.service';
import { OdontogramaResponse } from '../../../core/models/odontograma.model';
import { EMPTY_ANAMNESIS } from '../../../core/utils/anamnesis.util';

function emptyOdonto(overrides: Partial<OdontogramaResponse> = {}): OdontogramaResponse {
  return {
    appointmentId: 'apt-1',
    patientId: 'p-1',
    estadoActual: { caras: [], leyendas: [] },
    cambiosTurno: { caras: [], leyendas: [] },
    ...overrides
  };
}

function currentValue<T>(obs: { subscribe: (fn: (v: T) => void) => void }): T {
  let value!: T;
  obs.subscribe(v => (value = v));
  return value;
}

describe('OdontoStateService', () => {
  let service: OdontoStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OdontoStateService);
  });

  describe('loadOdonto()', () => {
    it('siempre resetea historiaClinica$ a EMPTY_ANAMNESIS, aunque no tenga relación con el turno nuevo', () => {
      service.setHistoriaClinica({ items: [{ label: 'Alergias', value: 'Penicilina' }], otros: '' });
      expect(currentValue(service.historiaClinica$)).not.toEqual(EMPTY_ANAMNESIS);

      service.loadOdonto(emptyOdonto());

      expect(currentValue(service.historiaClinica$)).toEqual(EMPTY_ANAMNESIS);
    });

    it('pre-siembra los 52 dientes (permanentes + deciduos) con todas las caras en normal', () => {
      service.loadOdonto(emptyOdonto());
      const facesMap = currentValue(service.faces$);

      expect(facesMap.size).toBe(52);
      expect(facesMap.get(11)).toEqual({ top: 'normal', right: 'normal', center: 'normal', left: 'normal', bottom: 'normal' });
      expect(facesMap.get(55)).toBeDefined(); // diente deciduo
    });

    it('editable ausente en la respuesta se interpreta como editable', () => {
      service.loadOdonto(emptyOdonto());
      expect(service.isEditable).toBe(true);
    });

    it('editable: false vuelve no-op a los mutadores, salvo setHistoriaClinica', () => {
      service.loadOdonto(emptyOdonto({ editable: false }));
      expect(service.isEditable).toBe(false);

      service.cycleFace(11, 'top');
      expect(service.getFaceState(11, 'top')).toBe('normal');

      service.selectTooth(11);
      service.toggleItemForSelectedTooth({ label: 'M1', icono: 'm1' }, true);
      expect(service.getIconsForTooth(11)).toEqual([]);

      service.setComentario('nuevo comentario');
      expect(currentValue(service.comentario$)).toBe('');

      service.setPlanTratamiento('nuevo plan');
      expect(currentValue(service.planTratamiento$)).toBe('');

      // setHistoriaClinica es la única excepción: no respeta `editable`.
      service.setHistoriaClinica({ items: [{ label: 'Alergias', value: 'Penicilina' }], otros: '' });
      expect(currentValue(service.historiaClinica$).items).toHaveLength(1);
    });
  });

  describe('cycleFace()', () => {
    it('cicla normal → caries → obturacion → ausente → normal', () => {
      service.loadOdonto(emptyOdonto());

      service.cycleFace(11, 'top');
      expect(service.getFaceState(11, 'top')).toBe('caries');
      service.cycleFace(11, 'top');
      expect(service.getFaceState(11, 'top')).toBe('obturacion');
      service.cycleFace(11, 'top');
      expect(service.getFaceState(11, 'top')).toBe('ausente');
      service.cycleFace(11, 'top');
      expect(service.getFaceState(11, 'top')).toBe('normal');
    });
  });

  describe('toggleItemForSelectedTooth() / removeItemsByLabelsForSelectedTooth()', () => {
    it('sin diente seleccionado: no-op', () => {
      service.loadOdonto(emptyOdonto());
      service.selectTooth(null);

      service.toggleItemForSelectedTooth({ label: 'M1', icono: 'm1' }, true);
      expect(service.isItemSelectedForCurrentTooth('M1')).toBe(false);

      expect(() => service.removeItemsByLabelsForSelectedTooth(['M1'])).not.toThrow();
    });

    it('con diente seleccionado: agrega y quita ítems', () => {
      service.loadOdonto(emptyOdonto());
      service.selectTooth(11);

      service.toggleItemForSelectedTooth({ label: 'Corona', icono: 'corona' }, true);
      expect(service.isItemSelectedForCurrentTooth('Corona')).toBe(true);
      expect(service.getIconsForTooth(11)).toEqual([{ label: 'Corona', icono: 'corona' }]);

      service.toggleItemForSelectedTooth({ label: 'Corona', icono: 'corona' }, false);
      expect(service.isItemSelectedForCurrentTooth('Corona')).toBe(false);
    });

    it('no duplica un ítem ya seleccionado si se marca de nuevo', () => {
      service.loadOdonto(emptyOdonto());
      service.selectTooth(11);
      service.toggleItemForSelectedTooth({ label: 'Corona', icono: 'corona' }, true);
      service.toggleItemForSelectedTooth({ label: 'Corona', icono: 'corona' }, true);
      expect(service.getIconsForTooth(11)).toHaveLength(1);
    });
  });

  describe('carga de leyendas (applyOdontoState)', () => {
    it('movilidad se traduce a un único ítem M<n>', () => {
      service.loadOdonto(emptyOdonto({
        estadoActual: { caras: [], leyendas: [{ numeroDiente: 11, movilidad: 2 }] }
      }));

      const icons = service.getIconsForTooth(11);
      expect(icons).toHaveLength(1);
      expect(icons[0].label).toBe('M2');
    });

    it('flags booleanos de estado/condición se traducen a sus labels', () => {
      service.loadOdonto(emptyOdonto({
        estadoActual: { caras: [], leyendas: [{ numeroDiente: 11, corona: true, fractura: true }] }
      }));

      const labels = service.getIconsForTooth(11).map(i => i.label);
      expect(labels).toEqual(expect.arrayContaining(['Corona', 'Fractura']));
    });
  });

  describe('buildOdontogramDelta()', () => {
    it('una reversión a "normal" SÍ genera entrada en el delta si el baseline no era normal', () => {
      service.loadOdonto(emptyOdonto({
        estadoActual: { caras: [{ numeroDiente: 11, cara: 'arriba', estado: 'caries' }], leyendas: [] }
      }));

      // caries -> obturacion -> ausente -> normal (3 ciclos)
      service.cycleFace(11, 'top');
      service.cycleFace(11, 'top');
      service.cycleFace(11, 'top');
      expect(service.getFaceState(11, 'top')).toBe('normal');

      const delta = service.buildOdontogramDelta();
      expect(delta.caras).toContainEqual({ numeroDiente: 11, cara: 'arriba', estado: 'normal' });
    });

    it('una cara sin cambios respecto al baseline no entra en el delta', () => {
      service.loadOdonto(emptyOdonto());
      const delta = service.buildOdontogramDelta();
      expect(delta.caras).toEqual([]);
    });

    it('comentario/planTratamiento solo entran si cambiaron contra el baseline', () => {
      service.loadOdonto(emptyOdonto({ comentario: 'original', planTratamiento: 'plan original' }));

      let delta = service.buildOdontogramDelta();
      expect(delta.comentario).toBeUndefined();
      expect(delta.planTratamiento).toBeUndefined();

      service.setComentario('nuevo');
      delta = service.buildOdontogramDelta();
      expect(delta.comentario).toBe('nuevo');
      expect(delta.planTratamiento).toBeUndefined();
    });

    it('pago solo aparece en el delta si se pasa como argumento', () => {
      service.loadOdonto(emptyOdonto());
      expect(service.buildOdontogramDelta().pago).toBeUndefined();

      const withPago = service.buildOdontogramDelta({ montoPago: 100 });
      expect(withPago.pago).toEqual({ montoPago: 100 });
    });

    it('una leyenda nueva con datos entra en el delta; sin datos, no', () => {
      service.loadOdonto(emptyOdonto());
      service.selectTooth(21);
      service.toggleItemForSelectedTooth({ label: 'Corona', icono: 'corona' }, true);

      const delta = service.buildOdontogramDelta();
      expect((delta.leyendas ?? []).some(l => l.numeroDiente === 21 && l.corona)).toBe(true);
    });
  });

  describe('applySaveResponse() vs. loadOdonto()', () => {
    it('no toca editable, no toca comentarioAnterior, no resetea historiaClinica', () => {
      service.loadOdonto(emptyOdonto({ editable: false, comentarioAnterior: 'previo' }));
      service.setHistoriaClinica({ items: [{ label: 'Alergias', value: 'Penicilina' }], otros: '' });
      const historiaAntes = currentValue(service.historiaClinica$);

      service.applySaveResponse(emptyOdonto({ comentario: 'guardado' }));

      expect(service.isEditable).toBe(false);
      expect(currentValue(service.comentarioAnterior$)).toBe('previo');
      expect(currentValue(service.historiaClinica$)).toEqual(historiaAntes);
      expect(currentValue(service.comentario$)).toBe('guardado');
    });
  });
});
