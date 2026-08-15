import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError } from 'rxjs';
import { AdminPagosPanelComponent } from './admin-pagos-panel.component';
import { AdminService } from '../../admin.service';
import { OrganizationBillingDTO } from '../../admin.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

function billing(overrides: Partial<OrganizationBillingDTO> = {}): OrganizationBillingDTO {
  return {
    organizationId: 'org-1',
    nombre: 'Clínica Jackson',
    slug: 'clinica-jackson',
    estadoSuscripcion: 'ACTIVA',
    cancelacionDesde: null,
    fechaCancelacion: null,
    plan: 'MEDIO',
    precio: 40000,
    moneda: 'ARS',
    periodoPagoId: 'pago-1',
    periodoActual: '2026-08-01',
    fechaVencimiento: '2026-08-14',
    estadoPago: 'VENCIDO',
    diasVencido: 12,
    soloLectura: false,
    ...overrides
  };
}

function makeMocks(pagos: OrganizationBillingDTO[] = [billing()]) {
  return {
    adminService: {
      listarPagos: vi.fn(() => of(pagos)),
      listarPagosDeOrganizacion: vi.fn(() => of([])),
      confirmarPago: vi.fn(() => of({}))
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: { getErrorMessage: vi.fn(() => 'error'), isNetworkError: vi.fn(() => false) }
  };
}

async function renderPanel(mocks: ReturnType<typeof makeMocks>) {
  return render(AdminPagosPanelComponent, {
    providers: [
      { provide: AdminService, useValue: mocks.adminService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler }
    ]
  });
}

describe('AdminPagosPanelComponent', () => {

  it('lista las organizaciones con su estado de cobro', async () => {
    await renderPanel(makeMocks());

    expect(screen.getByText('Clínica Jackson')).toBeTruthy();
    expect(screen.getByTestId('admin-pago-estado-org-1').textContent).toContain('Vencido 12 d');
  });

  it('muestra "Dada de baja" cuando la suscripcion esta cancelada', async () => {
    await renderPanel(makeMocks([billing({
      estadoSuscripcion: 'CANCELADA',
      estadoPago: null,
      periodoPagoId: null,
      soloLectura: true
    })]));

    expect(screen.getByTestId('admin-pago-estado-org-1').textContent).toContain('Dada de baja');
  });

  it('sin periodo impago no ofrece confirmar el pago', async () => {
    await renderPanel(makeMocks([billing({ periodoPagoId: null, estadoPago: 'PAGADO', diasVencido: 0 })]));

    expect(screen.queryByTestId('admin-pago-confirmar-btn-org-1')).toBeNull();
  });

  it('confirmar un pago pide confirmacion antes de ejecutarlo', async () => {
    const mocks = makeMocks();
    await renderPanel(mocks);

    await userEvent.click(screen.getByTestId('admin-pago-confirmar-btn-org-1'));

    // El diálogo se abrió pero todavía no se llamó al backend.
    expect(mocks.adminService.confirmarPago).not.toHaveBeenCalled();
    expect(screen.getByText('Confirmar pago recibido')).toBeTruthy();
  });

  it('al confirmar, imputa el pago al periodo impago y recarga', async () => {
    const mocks = makeMocks();
    await renderPanel(mocks);

    await userEvent.click(screen.getByTestId('admin-pago-confirmar-btn-org-1'));
    // Por testid y no por texto: el botón de la fila y el del diálogo dicen lo mismo.
    await userEvent.click(screen.getByTestId('confirm-dialog-confirm-btn'));

    expect(mocks.adminService.confirmarPago).toHaveBeenCalledWith('org-1', 'pago-1');
    expect(mocks.notification.showSuccess).toHaveBeenCalled();
    // Una vez al montar y otra tras confirmar: el ciclo de esa organización se sincronizó.
    expect(mocks.adminService.listarPagos).toHaveBeenCalledTimes(2);
  });

  it('el historial se carga recien al desplegarlo', async () => {
    const mocks = makeMocks();
    await renderPanel(mocks);

    expect(mocks.adminService.listarPagosDeOrganizacion).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('admin-pago-historial-btn-org-1'));

    expect(mocks.adminService.listarPagosDeOrganizacion).toHaveBeenCalledWith('org-1');
  });

  it('avisa si falla la carga', async () => {
    const mocks = makeMocks();
    mocks.adminService.listarPagos = vi.fn(() => throwError(() => new Error('boom')));

    await renderPanel(mocks);

    expect(mocks.notification.showError).toHaveBeenCalled();
  });
});
