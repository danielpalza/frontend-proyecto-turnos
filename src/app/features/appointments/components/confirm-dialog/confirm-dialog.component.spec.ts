import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  it('open=false no renderiza nada', async () => {
    await render(ConfirmDialogComponent, { inputs: { open: false } });
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('muestra title/message/summary cuando open=true', async () => {
    await render(ConfirmDialogComponent, {
      inputs: { open: true, title: 'Eliminar turno', message: '¿Confirmás?', summary: 'Ana García - 10:00' }
    });

    expect(screen.getByTestId('confirm-dialog-title')).toHaveTextContent('Eliminar turno');
    expect(screen.getByText('¿Confirmás?')).toBeTruthy();
    expect(screen.getByTestId('confirm-dialog-detail')).toHaveTextContent('Ana García - 10:00');
  });

  it('sin summary, no renderiza el bloque de detalle', async () => {
    await render(ConfirmDialogComponent, { inputs: { open: true, summary: null } });
    expect(screen.queryByTestId('confirm-dialog-detail')).toBeNull();
  });

  describe('variantes según confirmButtonClass', () => {
    it('btn-danger: isDangerVariant true, ícono bi-x-lg', async () => {
      const { fixture } = await render(ConfirmDialogComponent, { inputs: { open: true, confirmButtonClass: 'btn-danger' } });
      expect(fixture.componentInstance.isDangerVariant).toBe(true);
      expect(fixture.componentInstance.isPrimaryVariant).toBe(false);
      expect(fixture.componentInstance.headerIcon).toBe('bi-x-lg');
    });

    it('btn-primary: isPrimaryVariant true, ícono bi-check-circle', async () => {
      const { fixture } = await render(ConfirmDialogComponent, { inputs: { open: true, confirmButtonClass: 'btn-primary' } });
      expect(fixture.componentInstance.isPrimaryVariant).toBe(true);
      expect(fixture.componentInstance.headerIcon).toBe('bi-check-circle');
    });

    it('cualquier otra clase: ninguna variante, ícono de pregunta genérico', async () => {
      const { fixture } = await render(ConfirmDialogComponent, { inputs: { open: true, confirmButtonClass: 'btn-outline-secondary' } });
      expect(fixture.componentInstance.isDangerVariant).toBe(false);
      expect(fixture.componentInstance.isPrimaryVariant).toBe(false);
      expect(fixture.componentInstance.headerIcon).toBe('bi-question-circle');
    });
  });

  describe('con isLoading=true, los 4 handlers de click son no-op', () => {
    it('no emite confirm/cancel/openChange al clickear confirmar, cancelar o cerrar', async () => {
      const confirm = vi.fn();
      const cancel = vi.fn();
      const openChange = vi.fn();
      await render(ConfirmDialogComponent, {
        inputs: { open: true, isLoading: true },
        on: { confirm, cancel, openChange }
      });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('confirm-dialog-close-btn'));

      expect(confirm).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
      expect(openChange).not.toHaveBeenCalled();
    });

    it('los botones de confirmar/cancelar/cerrar quedan disabled', async () => {
      await render(ConfirmDialogComponent, { inputs: { open: true, isLoading: true } });

      expect(screen.getByTestId('confirm-dialog-confirm-btn')).toBeDisabled();
      expect(screen.getByTestId('confirm-dialog-cancel-btn')).toBeDisabled();
      expect(screen.getByTestId('confirm-dialog-close-btn')).toBeDisabled();
    });
  });

  describe('con isLoading=false', () => {
    it('confirmar emite confirm (sin cerrar)', async () => {
      const confirm = vi.fn();
      const openChange = vi.fn();
      await render(ConfirmDialogComponent, { inputs: { open: true }, on: { confirm, openChange } });

      await userEvent.setup().click(screen.getByTestId('confirm-dialog-confirm-btn'));

      expect(confirm).toHaveBeenCalledTimes(1);
      expect(openChange).not.toHaveBeenCalled();
    });

    it('cancelar emite cancel Y cierra (openChange(false))', async () => {
      const cancel = vi.fn();
      const openChange = vi.fn();
      await render(ConfirmDialogComponent, { inputs: { open: true }, on: { cancel, openChange } });

      await userEvent.setup().click(screen.getByTestId('confirm-dialog-cancel-btn'));

      expect(cancel).toHaveBeenCalledTimes(1);
      expect(openChange).toHaveBeenCalledWith(false);
    });

    it('cerrar con la X emite solo openChange(false), sin cancel/confirm', async () => {
      const cancel = vi.fn();
      const confirm = vi.fn();
      const openChange = vi.fn();
      await render(ConfirmDialogComponent, { inputs: { open: true }, on: { cancel, confirm, openChange } });

      await userEvent.setup().click(screen.getByTestId('confirm-dialog-close-btn'));

      expect(openChange).toHaveBeenCalledWith(false);
      expect(cancel).not.toHaveBeenCalled();
      expect(confirm).not.toHaveBeenCalled();
    });

    it('clickear el backdrop cierra (openChange(false))', async () => {
      const openChange = vi.fn();
      await render(ConfirmDialogComponent, { inputs: { open: true }, on: { openChange } });

      await userEvent.setup().click(screen.getByTestId('confirm-dialog').parentElement!);

      expect(openChange).toHaveBeenCalledWith(false);
    });

    it('clickear dentro del modal no cierra (stopPropagation)', async () => {
      const openChange = vi.fn();
      await render(ConfirmDialogComponent, { inputs: { open: true }, on: { openChange } });

      await userEvent.setup().click(screen.getByTestId('confirm-dialog-title'));

      expect(openChange).not.toHaveBeenCalled();
    });
  });
});
