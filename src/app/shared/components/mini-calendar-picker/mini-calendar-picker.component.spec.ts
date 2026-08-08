import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MiniCalendarPickerComponent } from './mini-calendar-picker.component';

describe('MiniCalendarPickerComponent', () => {
  it('sin fecha seleccionada, muestra el label "Seleccionar"', async () => {
    await render(MiniCalendarPickerComponent, { inputs: { referenceMonth: new Date(2026, 7, 1) } });
    expect(screen.getByTestId('mini-calendar-trigger')).toHaveTextContent('Seleccionar');
  });

  it('con fecha seleccionada, muestra DD/MM/AAAA', async () => {
    await render(MiniCalendarPickerComponent, {
      inputs: { referenceMonth: new Date(2026, 7, 1), selectedDate: '2026-08-07' }
    });
    expect(screen.getByTestId('mini-calendar-trigger')).toHaveTextContent('07/08/2026');
  });

  it('emite dateChange y cierra el dropdown al elegir un día habilitado', async () => {
    const dateChange = vi.fn();
    await render(MiniCalendarPickerComponent, {
      inputs: { referenceMonth: new Date(2026, 7, 1) },
      on: { dateChange }
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('mini-calendar-trigger'));
    expect(screen.getByTestId('mini-calendar-dropdown')).toBeTruthy();

    await user.click(screen.getByTestId('mini-calendar-day-2026-08-10'));

    expect(dateChange).toHaveBeenCalledWith('2026-08-10');
    expect(screen.queryByTestId('mini-calendar-dropdown')).toBeNull();
  });

  it('un día fuera de [minDate, maxDate] queda deshabilitado; el límite exacto no', async () => {
    await render(MiniCalendarPickerComponent, {
      inputs: { referenceMonth: new Date(2026, 7, 1), minDate: '2026-08-05', maxDate: '2026-08-05' }
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('mini-calendar-trigger'));

    expect(screen.getByTestId('mini-calendar-day-2026-08-05')).not.toBeDisabled();
    expect(screen.getByTestId('mini-calendar-day-2026-08-04')).toBeDisabled();
    expect(screen.getByTestId('mini-calendar-day-2026-08-06')).toBeDisabled();
  });

  it('un resize de window cierra el dropdown (no se reposiciona)', async () => {
    const { fixture } = await render(MiniCalendarPickerComponent, { inputs: { referenceMonth: new Date(2026, 7, 1) } });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('mini-calendar-trigger'));
    expect(screen.getByTestId('mini-calendar-dropdown')).toBeTruthy();

    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    expect(screen.queryByTestId('mini-calendar-dropdown')).toBeNull();
  });

  it('un click fuera del componente cierra el dropdown', async () => {
    await render(MiniCalendarPickerComponent, { inputs: { referenceMonth: new Date(2026, 7, 1) } });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('mini-calendar-trigger'));
    expect(screen.getByTestId('mini-calendar-dropdown')).toBeTruthy();

    await user.click(document.body);

    expect(screen.queryByTestId('mini-calendar-dropdown')).toBeNull();
  });
});
