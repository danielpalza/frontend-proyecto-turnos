import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminViewComponent } from './admin-view.component';
import { AdminService } from '../admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

function makeMocks() {
  return {
    adminService: {
      listarOrganizaciones: vi.fn(() => of([])),
      listarPagos: vi.fn(() => of([])),
      listarPagosDeOrganizacion: vi.fn(() => of([])),
      confirmarPago: vi.fn(() => of({}))
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: { getErrorMessage: vi.fn(() => 'error'), isNetworkError: vi.fn(() => false) }
  };
}

async function renderView(mocks: ReturnType<typeof makeMocks>) {
  return render(AdminViewComponent, {
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AdminService, useValue: mocks.adminService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler }
    ]
  });
}

describe('AdminViewComponent', () => {

  it('arranca en la pestaña de organizaciones: el panel de pagos no se monta ni pide datos', async () => {
    const mocks = makeMocks();
    await renderView(mocks);

    expect(screen.queryByTestId('admin-pagos-panel')).toBeNull();
    expect(mocks.adminService.listarPagos).not.toHaveBeenCalled();
  });

  it('cambiar a la pestaña de pagos monta el panel y carga los pagos', async () => {
    const mocks = makeMocks();
    await renderView(mocks);

    await userEvent.click(screen.getByTestId('admin-tab-pagos'));

    expect(screen.getByTestId('admin-pagos-panel')).toBeTruthy();
    expect(mocks.adminService.listarPagos).toHaveBeenCalledTimes(1);
  });

  it('volver a organizaciones desmonta el panel de pagos', async () => {
    const mocks = makeMocks();
    await renderView(mocks);

    await userEvent.click(screen.getByTestId('admin-tab-pagos'));
    expect(screen.getByTestId('admin-pagos-panel')).toBeTruthy();

    await userEvent.click(screen.getByTestId('admin-tab-organizaciones'));
    expect(screen.queryByTestId('admin-pagos-panel')).toBeNull();
  });
});
