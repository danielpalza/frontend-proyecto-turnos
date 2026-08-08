import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SearchInputComponent } from './search-input.component';
import { Patient } from '../../../core/models';

const patient: Patient = {
  id: 'p1',
  nombre: 'Ana',
  apellido: 'García',
  identificacion: '30111222',
  email: 'ana@example.com'
};

describe('SearchInputComponent', () => {
  it('muestra el placeholder y el valor inicial', async () => {
    await render(SearchInputComponent, {
      inputs: { placeholder: 'Buscar paciente...', selectedValue: 'Ana' }
    });

    const input = screen.getByTestId('search-input') as HTMLInputElement;
    expect(input.placeholder).toBe('Buscar paciente...');
    expect(input.value).toBe('Ana');
  });

  it('con debounceTime > 0 no emite searchChange hasta que pasa el debounce', async () => {
    vi.useFakeTimers();
    try {
      const searchChange = vi.fn();
      const user = userEvent.setup({ delay: null });
      await render(SearchInputComponent, {
        inputs: { debounceTime: 300 },
        on: { searchChange }
      });

      await user.type(screen.getByTestId('search-input'), 'ana');

      expect(searchChange).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(searchChange).toHaveBeenCalledTimes(1);
      expect(searchChange).toHaveBeenCalledWith('ana');
    } finally {
      vi.useRealTimers();
    }
  });

  it('con debounceTime en 0 emite searchChange en cada input', async () => {
    const searchChange = vi.fn();
    const user = userEvent.setup();
    await render(SearchInputComponent, {
      inputs: { debounceTime: 0 },
      on: { searchChange }
    });

    await user.type(screen.getByTestId('search-input'), 'x');

    expect(searchChange).toHaveBeenCalledWith('x');
  });

  it('el botón de limpiar vacía el input y emite clear y searchChange vacío', async () => {
    const clear = vi.fn();
    const searchChange = vi.fn();
    const user = userEvent.setup();
    await render(SearchInputComponent, {
      inputs: { selectedValue: 'Ana' },
      on: { clear, searchChange }
    });

    await user.click(screen.getByTestId('search-clear-btn'));

    // El botón dispara onClear() tanto en mousedown como en click (ver template), así que
    // puede emitir más de una vez por click de usuario; lo relevante es que emitió lo esperado.
    expect(clear).toHaveBeenCalled();
    expect(searchChange).toHaveBeenCalledWith('');
    expect((screen.getByTestId('search-input') as HTMLInputElement).value).toBe('');
  });

  it('muestra el checkbox de saldo pendiente solo si showPendingOnlyFilter es true y emite al togglear', async () => {
    const pendingOnlyChange = vi.fn();
    const user = userEvent.setup();
    await render(SearchInputComponent, {
      inputs: { showPendingOnlyFilter: true, pendingOnly: false },
      on: { pendingOnlyChange }
    });

    const checkbox = screen.getByTestId('search-pending-checkbox');
    await user.click(checkbox);

    expect(pendingOnlyChange).toHaveBeenCalledWith(true);
  });

  it('no muestra el checkbox de saldo pendiente si showPendingOnlyFilter es false', async () => {
    await render(SearchInputComponent, { inputs: { showPendingOnlyFilter: false } });

    expect(screen.queryByTestId('search-pending-checkbox')).toBeNull();
  });

  it('seleccionar un paciente del dropdown emite select con el paciente elegido', async () => {
    const select = vi.fn();
    const user = userEvent.setup();
    await render(SearchInputComponent, {
      inputs: { patients: [patient], searchType: 'patient' },
      on: { select }
    });

    await user.click(screen.getByTestId('search-input'));

    expect(await screen.findByTestId('search-item-patient-p1')).toBeVisible();

    await user.click(screen.getByTestId('search-item-patient-p1'));

    expect(select).toHaveBeenCalledWith({ type: 'patient', item: patient });
  });
});
