import { render } from '@testing-library/angular';
import { of, Subject } from 'rxjs';
import { OdontogramaFormComponent } from './odontograma-form.component';
import { LeyendaItem, OdontogramaStateService } from '../../services/odontograma-state.service';

function makeMocks(overrides: { icons?: Record<number, LeyendaItem[]> } = {}) {
  const icons = overrides.icons ?? {};
  return {
    stateService: {
      selectedTooth$: new Subject<number | null>(),
      faces$: of(void 0),
      selectTooth: vi.fn(),
      getIconsForTooth: vi.fn((tooth: number) => icons[tooth] ?? []),
      getFaceState: vi.fn(() => 'normal'),
      cycleFace: vi.fn()
    }
  };
}

async function renderForm(mocks: ReturnType<typeof makeMocks>) {
  return render(OdontogramaFormComponent, {
    providers: [{ provide: OdontogramaStateService, useValue: mocks.stateService }]
  });
}

function icon(label: string): LeyendaItem {
  return { label } as LeyendaItem;
}

describe('OdontogramaFormComponent', () => {
  describe('selectTooth', () => {
    it('clickear un diente no seleccionado lo selecciona', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderForm(mocks);

      fixture.componentInstance.selectTooth(11);

      expect(mocks.stateService.selectTooth).toHaveBeenCalledWith(11);
    });

    it('clickear el diente YA seleccionado lo deselecciona (selectTooth(null)), no lo vuelve a seleccionar', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderForm(mocks);
      (mocks.stateService.selectedTooth$ as Subject<number | null>).next(11);

      fixture.componentInstance.selectTooth(11);

      expect(mocks.stateService.selectTooth).toHaveBeenCalledWith(null);
    });

    it('isToothSelected refleja el diente emitido por selectedTooth$', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.isToothSelected(11)).toBe(false);

      (mocks.stateService.selectedTooth$ as Subject<number | null>).next(11);

      expect(fixture.componentInstance.isToothSelected(11)).toBe(true);
      expect(fixture.componentInstance.isToothSelected(12)).toBe(false);
    });
  });

  describe('getMovilidadIconForTooth / getFurcaIconForTooth / getToothIconsExcludingMovilidad', () => {
    it('un diente con ícono de movilidad y otros íconos sueltos: cada getter da lo suyo sin duplicar ni perder', async () => {
      const mocks = makeMocks({
        icons: { 11: [icon('M2'), icon('F1'), icon('CARIES')] }
      });
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.getMovilidadIconForTooth(11)?.label).toBe('M2');
      expect(fixture.componentInstance.getFurcaIconForTooth(11)?.label).toBe('F1');
      expect(fixture.componentInstance.getToothIconsExcludingMovilidad(11).map(i => i.label)).toEqual(['CARIES']);
    });

    it('un diente sin ícono de movilidad/furca da null en esos getters', async () => {
      const mocks = makeMocks({ icons: { 11: [icon('CARIES')] } });
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.getMovilidadIconForTooth(11)).toBeNull();
      expect(fixture.componentInstance.getFurcaIconForTooth(11)).toBeNull();
      expect(fixture.componentInstance.getToothIconsExcludingMovilidad(11)).toEqual([icon('CARIES')]);
    });

    it('un diente sin ningún ícono da listas/nulls vacíos, sin romper', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.getMovilidadIconForTooth(99)).toBeNull();
      expect(fixture.componentInstance.getToothIconsExcludingMovilidad(99)).toEqual([]);
    });
  });

  it('permanentTeeth/primaryTeeth tienen la disposición fija de cuadrantes', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderForm(mocks);

    expect(fixture.componentInstance.permanentTeeth.topRight).toEqual([18, 17, 16, 15, 14, 13, 12, 11]);
    expect(fixture.componentInstance.primaryTeeth.bottomLeft).toEqual([71, 72, 73, 74, 75]);
  });
});
