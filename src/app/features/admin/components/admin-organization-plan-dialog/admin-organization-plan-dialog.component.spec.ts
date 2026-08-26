import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError } from 'rxjs';
import { AdminOrganizationPlanDialogComponent } from './admin-organization-plan-dialog.component';
import { OrganizationAdminDTO } from '../../admin.models';
import { PlanCatalogItem } from '../../../../core/models';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

function organization(overrides: Partial<OrganizationAdminDTO> = {}): OrganizationAdminDTO {
  return {
    id: 'org-1',
    nombre: 'Clínica Jackson',
    slug: 'clinica-jackson',
    pais: 'AR',
    activa: true,
    createdAt: '2026-01-01',
    plan: 'BASICO',
    estadoSuscripcion: 'ACTIVA',
    userCount: 1,
    patientCount: 0,
    appointmentCount: 0,
    modules: [],
    ...overrides
  };
}

function planItem(overrides: Partial<PlanCatalogItem> = {}): PlanCatalogItem {
  return {
    codigo: 'BASICO',
    nombre: 'Básico',
    precioMensual: 15000,
    moneda: 'ARS',
    maxProfesionales: 2,
    maxUsuarios: 2,
    orden: 1,
    ...overrides
  };
}

function makeMocks(planes: PlanCatalogItem[] = [
  planItem(),
  planItem({ codigo: 'MEDIO', nombre: 'Medio', orden: 2 })
]) {
  return {
    subscriptionService: { getPlanes: vi.fn(() => of(planes)) },
    errorHandler: { getErrorMessage: vi.fn(() => 'error'), isNetworkError: vi.fn(() => false) }
  };
}

async function renderDialog(
  mocks: ReturnType<typeof makeMocks>,
  inputs: Record<string, unknown> = {},
  on: Record<string, (...args: any[]) => void> = {}
) {
  return render(AdminOrganizationPlanDialogComponent, {
    inputs: { open: true, organization: organization(), ...inputs },
    on,
    providers: [
      { provide: SubscriptionService, useValue: mocks.subscriptionService },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler }
    ]
  });
}

describe('AdminOrganizationPlanDialogComponent', () => {

  it('cerrado no renderiza el diálogo', async () => {
    await render(AdminOrganizationPlanDialogComponent, {
      inputs: { open: false, organization: organization() },
      providers: [
        { provide: SubscriptionService, useValue: makeMocks().subscriptionService },
        { provide: ErrorHandlerService, useValue: makeMocks().errorHandler }
      ]
    });

    expect(screen.queryByTestId('admin-plan-dialog')).toBeNull();
  });

  it('al abrir, carga el catálogo y pinta las opciones', async () => {
    const mocks = makeMocks();
    await renderDialog(mocks);

    expect(mocks.subscriptionService.getPlanes).toHaveBeenCalled();
    expect(screen.getByTestId('admin-plan-option-BASICO')).toBeTruthy();
    expect(screen.getByTestId('admin-plan-option-MEDIO')).toBeTruthy();
  });

  it('marca el plan actual de la organización', async () => {
    const mocks = makeMocks();
    await renderDialog(mocks, { organization: organization({ plan: 'MEDIO' }) });

    expect(screen.getByTestId('admin-plan-option-MEDIO').className).toContain('actual');
  });

  it('error al cargar el catálogo muestra el mensaje inline, sin toast (no hay NotificationService)', async () => {
    const mocks = makeMocks();
    mocks.subscriptionService.getPlanes = vi.fn(() => throwError(() => new Error('boom')));
    await renderDialog(mocks);

    expect(screen.getByTestId('admin-plan-load-error').textContent).toContain('error');
  });

  it('elegir un plan superior habilita guardar y, al confirmar, emite save', async () => {
    const mocks = makeMocks();
    const save = vi.fn();
    await renderDialog(mocks, { organization: organization({ plan: 'BASICO' }) }, { save });

    await userEvent.click(screen.getByTestId('admin-plan-option-MEDIO'));
    expect(screen.queryByTestId('admin-plan-aviso-baja')).toBeNull();

    const saveBtn = screen.getByTestId('admin-plan-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    await userEvent.click(saveBtn);

    expect(save).toHaveBeenCalledWith('MEDIO');
  });

  it('elegir un plan inferior al actual muestra el aviso de baja agendada', async () => {
    const mocks = makeMocks();
    await renderDialog(mocks, { organization: organization({ plan: 'MEDIO' }) });

    await userEvent.click(screen.getByTestId('admin-plan-option-BASICO'));

    expect(screen.getByTestId('admin-plan-aviso-baja')).toBeTruthy();
  });

  it('saveError (input) se muestra', async () => {
    const mocks = makeMocks();
    await renderDialog(mocks, { saveError: 'No se pudo guardar' });

    expect(screen.getByTestId('admin-plan-save-error').textContent).toContain('No se pudo guardar');
  });

  it('suscripción cancelada muestra el aviso correspondiente', async () => {
    const mocks = makeMocks();
    await renderDialog(mocks, { organization: organization({ estadoSuscripcion: 'CANCELADA' }) });

    expect(screen.getByTestId('admin-plan-cancelada')).toBeTruthy();
  });

  it('cerrar con isSaving=true no emite openChange', async () => {
    const mocks = makeMocks();
    const openChange = vi.fn();
    await renderDialog(mocks, { isSaving: true }, { openChange });

    await userEvent.click(screen.getByTestId('admin-plan-close-btn'));
    await userEvent.click(screen.getByTestId('admin-plan-cancel-btn'));

    expect(openChange).not.toHaveBeenCalled();
  });
});
