import { render, screen, fireEvent } from '@testing-library/angular';
import { of, Subject } from 'rxjs';
import { PeriodontogramaFormComponent } from './periodontograma-form.component';
import { OdontogramaStateService } from '../../services/odontograma-state.service';
import { PerioFaceMvp, PerioToothMvp } from '../../../../core/models/periodontograma.model';

function face(overrides: Partial<PerioFaceMvp> = {}): PerioFaceMvp {
  return {
    probing: [0, 0, 0], mg: [0, 0, 0],
    bleeding: [false, false, false], plaque: [false, false, false],
    suppuration: [false, false, false], calculus: [false, false, false],
    ...overrides
  };
}

function tooth(id: number, overrides: Partial<PerioToothMvp> = {}): PerioToothMvp {
  return { id, present: true, vestibular: face(), lingual: face(), mobility: 0, furcation: 0, ...overrides };
}

function makeMocks(teeth: PerioToothMvp[] = []) {
  const map = new Map(teeth.map(t => [t.id, t]));
  return {
    stateService: {
      getPerioTeethMap: vi.fn(() => map),
      perioTeeth$: new Subject<Map<number, PerioToothMvp>>(),
      updatePerioTooth: vi.fn((id: number, mutate: (t: PerioToothMvp) => void) => {
        const t = map.get(id);
        if (t) mutate(t);
      }),
      notifyPerioChange: vi.fn()
    },
    map
  };
}

async function renderForm(mocks: ReturnType<typeof makeMocks>) {
  return render(PeriodontogramaFormComponent, {
    providers: [{ provide: OdontogramaStateService, useValue: mocks.stateService }]
  });
}

describe('PeriodontogramaFormComponent', () => {
  describe('KPIs de porcentaje: misma fórmula y guard totalSites===0', () => {
    it('sin ningún diente presente, los 4 porcentajes dan 0 (evita división por cero)', async () => {
      const mocks = makeMocks([tooth(18, { present: false })]);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.bleedingPercent).toBe(0);
      expect(fixture.componentInstance.plaquePercent).toBe(0);
      expect(fixture.componentInstance.suppurationPercent).toBe(0);
      expect(fixture.componentInstance.calculusPercent).toBe(0);
    });

    it('cuenta sitios vestibular+lingual sobre el total (6 sitios por diente presente)', async () => {
      const t = tooth(18, {
        vestibular: face({ bleeding: [true, false, false], plaque: [true, true, false] }),
        lingual: face({ bleeding: [true, false, false] })
      });
      const mocks = makeMocks([t]);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.totalSites).toBe(6);
      // 2 sitios de sangrado (1 vest + 1 ling) sobre 6 = 33% redondeado
      expect(fixture.componentInstance.bleedingPercent).toBe(Math.round((2 / 6) * 100));
      expect(fixture.componentInstance.plaquePercent).toBe(Math.round((2 / 6) * 100));
      expect(fixture.componentInstance.suppurationPercent).toBe(0);
    });
  });

  describe('onNumberInput: límites distintos para mg ([-10,12]) y probing ([0,12])', () => {
    it('un valor negativo en mg se acepta si está dentro de [-10,12]', async () => {
      const t = tooth(18);
      const mocks = makeMocks([t]);
      const { fixture } = await renderForm(mocks);
      const input = { value: '-5' } as HTMLInputElement;

      fixture.componentInstance.onNumberInput(18, 'vestibular', 'mg', 0, { target: input } as unknown as Event);

      expect(t.vestibular.mg[0]).toBe(-5);
    });

    it('el mismo valor negativo en probing se clampa a 0 (probing no admite negativos)', async () => {
      const t = tooth(18);
      const mocks = makeMocks([t]);
      const { fixture } = await renderForm(mocks);
      const input = { value: '-5' } as HTMLInputElement;

      fixture.componentInstance.onNumberInput(18, 'vestibular', 'probing', 0, { target: input } as unknown as Event);

      expect(t.vestibular.probing[0]).toBe(0);
    });

    it('un valor mayor a 12 se clampa a 12 en ambos campos', async () => {
      const t = tooth(18);
      const mocks = makeMocks([t]);
      const { fixture } = await renderForm(mocks);

      fixture.componentInstance.onNumberInput(18, 'vestibular', 'mg', 0, { target: { value: '99' } } as unknown as Event);
      fixture.componentInstance.onNumberInput(18, 'vestibular', 'probing', 0, { target: { value: '99' } } as unknown as Event);

      expect(t.vestibular.mg[0]).toBe(12);
      expect(t.vestibular.probing[0]).toBe(12);
    });
  });

  describe('onFocusClearIfZero / onBlurRestoreZero: manipulan el DOM real, disparado sobre un template renderizado', () => {
    it('foco en un input en 0 lo vacía; blur sin tipear nada lo restaura a 0', async () => {
      const mocks = makeMocks([tooth(18)]);
      await renderForm(mocks);
      const input = screen.getByTestId('periodontogram-ps-vest-18-0') as HTMLInputElement;

      fireEvent.focus(input);
      expect(input.value).toBe('');

      fireEvent.blur(input);
      expect(input.value).toBe('0');
    });

    it('foco en un input distinto de 0 no lo toca', async () => {
      const mocks = makeMocks([tooth(18, { vestibular: face({ probing: [4, 0, 0] }) })]);
      await renderForm(mocks);
      const input = screen.getByTestId('periodontogram-ps-vest-18-0') as HTMLInputElement;

      fireEvent.focus(input);

      expect(input.value).toBe('4');
    });

    it('si se escribió algo real antes del blur, no se pisa con 0', async () => {
      const mocks = makeMocks([tooth(18)]);
      await renderForm(mocks);
      const input = screen.getByTestId('periodontogram-ps-vest-18-0') as HTMLInputElement;

      fireEvent.focus(input);
      input.value = '7';
      fireEvent.blur(input);

      expect(input.value).toBe('7');
    });
  });

  describe('onPerioTabPath: navegación de foco entre celdas del grid perio', () => {
    it('Tab en un input de MG salta al input de PS del mismo sitio', async () => {
      const mocks = makeMocks([tooth(18)]);
      await renderForm(mocks);
      const psInput = screen.getByTestId('periodontogram-ps-vest-18-0') as HTMLInputElement;
      const mgInput = psInput.closest('.perio-grid')!.querySelector<HTMLInputElement>('input[data-field="mg"][data-site="0"]')!;
      mgInput.focus();

      fireEvent.keyDown(mgInput, { key: 'Tab', code: 'Tab' });

      expect(document.activeElement).toBe(psInput);
    });

    it('Tab en PS de sitio 0 o 1 salta al MG del sitio siguiente', async () => {
      const mocks = makeMocks([tooth(18)]);
      await renderForm(mocks);
      const psSite0 = screen.getByTestId('periodontogram-ps-vest-18-0') as HTMLInputElement;
      const mgSite1 = psSite0.closest('.perio-grid')!.querySelector<HTMLInputElement>('input[data-field="mg"][data-site="1"]')!;
      psSite0.focus();

      fireEvent.keyDown(psSite0, { key: 'Tab', code: 'Tab' });

      expect(document.activeElement).toBe(mgSite1);
    });

    it('Tab en PS del sitio 2 (el último) salta al MG del sitio 0 de la próxima pieza presente', async () => {
      const mocks = makeMocks([tooth(18), tooth(17)]);
      await renderForm(mocks);
      const psSite2Tooth18 = screen.getByTestId('periodontogram-ps-vest-18-2') as HTMLInputElement;
      const mgSite0Tooth17 = screen.getByTestId('periodontogram-ps-vest-17-0')
        .closest('.perio-grid')!.querySelector<HTMLInputElement>('input[data-field="mg"][data-site="0"]')!;
      psSite2Tooth18.focus();

      fireEvent.keyDown(psSite2Tooth18, { key: 'Tab', code: 'Tab' });

      expect(document.activeElement).toBe(mgSite0Tooth17);
    });

    it('con shiftKey (Shift+Tab), no intercepta: deja el comportamiento nativo del navegador', async () => {
      const mocks = makeMocks([tooth(18)]);
      await renderForm(mocks);
      const psInput = screen.getByTestId('periodontogram-ps-vest-18-0') as HTMLInputElement;
      psInput.focus();

      fireEvent.keyDown(psInput, { key: 'Tab', code: 'Tab', shiftKey: true });

      expect(document.activeElement).toBe(psInput);
    });

    it('un input deshabilitado (diente ausente) no recibe el foco', async () => {
      const mocks = makeMocks([tooth(18), tooth(17, { present: false })]);
      await renderForm(mocks);
      const psSite2Tooth18 = screen.getByTestId('periodontogram-ps-vest-18-2') as HTMLInputElement;
      psSite2Tooth18.focus();

      fireEvent.keyDown(psSite2Tooth18, { key: 'Tab', code: 'Tab' });

      expect(document.activeElement).toBe(psSite2Tooth18);
    });
  });

  it('syncPerio delega en notifyPerioChange del servicio', async () => {
    const mocks = makeMocks([tooth(18)]);
    const { fixture } = await renderForm(mocks);

    fixture.componentInstance.syncPerio();

    expect(mocks.stateService.notifyPerioChange).toHaveBeenCalled();
  });

  describe('avgProbing / deepSites / perioValueToneClass', () => {
    it('avgProbing ignora ceros y promedia los sitios con valor real', async () => {
      const t = tooth(18, { vestibular: face({ probing: [0, 4, 6] }), lingual: face({ probing: [0, 0, 0] }) });
      const mocks = makeMocks([t]);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.avgProbing).toBe('5.0');
    });

    it('sin ningún sitio medido, avgProbing da "—"', async () => {
      const mocks = makeMocks([tooth(18)]);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.avgProbing).toBe('—');
    });

    it('deepSites cuenta sitios con PS >= 6', async () => {
      const t = tooth(18, { vestibular: face({ probing: [6, 5, 7] }) });
      const mocks = makeMocks([t]);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.deepSites).toBe(2);
    });

    it('perioValueToneClass: <=3 low, <=5 mid, >5 high, no finito -> low', async () => {
      const mocks = makeMocks([tooth(18)]);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.perioValueToneClass(2)).toBe('perio-val--low');
      expect(fixture.componentInstance.perioValueToneClass(4)).toBe('perio-val--mid');
      expect(fixture.componentInstance.perioValueToneClass(9)).toBe('perio-val--high');
      expect(fixture.componentInstance.perioValueToneClass(NaN)).toBe('perio-val--low');
    });
  });
});
