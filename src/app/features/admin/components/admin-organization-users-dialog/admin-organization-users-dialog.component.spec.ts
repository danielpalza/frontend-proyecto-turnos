import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError, from } from 'rxjs';
import { AdminOrganizationUsersDialogComponent } from './admin-organization-users-dialog.component';
import { AdminService } from '../../admin.service';
import { AdminUserDTO, OrganizationAdminDTO } from '../../admin.models';
import { NotificationService } from '../../../../core/services/notification.service';
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

function user(overrides: Partial<AdminUserDTO> = {}): AdminUserDTO {
  return {
    id: 'u-1',
    username: 'jperez',
    email: 'jperez@x.com',
    nombre: 'Juan',
    apellido: 'Pérez',
    activo: true,
    role: 'USER',
    organizationId: 'org-1',
    organizationNombre: 'Clínica Jackson',
    ...overrides
  };
}

function makeMocks(users: AdminUserDTO[] = [user()]) {
  return {
    adminService: {
      listarUsuarios: vi.fn((_orgId: string) => of(users)),
      toggleUsuarioActivo: vi.fn(() => of({ ...user(), activo: false })),
      actualizarRolUsuario: vi.fn(() => of({ ...user(), role: 'ADMIN' }))
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: { getErrorMessage: vi.fn(() => 'error'), isNetworkError: vi.fn(() => false) }
  };
}

async function renderDialog(mocks: ReturnType<typeof makeMocks>, inputs: Record<string, unknown> = {}) {
  return render(AdminOrganizationUsersDialogComponent, {
    inputs: { open: true, organization: organization(), ...inputs },
    providers: [
      { provide: AdminService, useValue: mocks.adminService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler }
    ]
  });
}

describe('AdminOrganizationUsersDialogComponent', () => {

  it('al abrir, carga y pinta los usuarios de la organización', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);
    fixture.detectChanges();

    expect(mocks.adminService.listarUsuarios).toHaveBeenCalledWith('org-1');
    expect(screen.getByTestId('admin-users-row-u-1')).toBeTruthy();
    expect(screen.getByTestId('admin-users-name-u-1').textContent).toContain('Juan Pérez');
  });

  describe('errores de red: se resuelve el mensaje pero no se muestra el toast', () => {
    it('al cargar los usuarios', async () => {
      const mocks = makeMocks();
      mocks.adminService.listarUsuarios = vi.fn(() => throwError(() => new Error('sin conexión')));
      mocks.errorHandler.isNetworkError = vi.fn(() => true);

      const { fixture } = await renderDialog(mocks);
      fixture.detectChanges();

      expect(mocks.errorHandler.getErrorMessage).toHaveBeenCalled();
      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });
  });

  it('error no-red al cargar sí muestra el toast', async () => {
    const mocks = makeMocks();
    mocks.adminService.listarUsuarios = vi.fn(() => throwError(() => new Error('boom')));

    const { fixture } = await renderDialog(mocks);
    fixture.detectChanges();

    expect(mocks.notification.showError).toHaveBeenCalled();
  });

  it('togglear un usuario pide confirmación antes de llamar al backend', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);
    fixture.detectChanges();

    await userEvent.click(screen.getByTestId('admin-users-toggle-active-btn-u-1'));

    expect(mocks.adminService.toggleUsuarioActivo).not.toHaveBeenCalled();
    expect(screen.getByText('Cambiar estado del usuario')).toBeTruthy();

    await userEvent.click(screen.getByTestId('confirm-dialog-confirm-btn'));

    expect(mocks.adminService.toggleUsuarioActivo).toHaveBeenCalledWith('org-1', 'u-1');
    expect(mocks.notification.showSuccess).toHaveBeenCalled();
  });

  it('cancelar el toggle no llama al backend', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);
    fixture.detectChanges();

    await userEvent.click(screen.getByTestId('admin-users-toggle-active-btn-u-1'));
    await userEvent.click(screen.getByTestId('confirm-dialog-cancel-btn'));

    expect(mocks.adminService.toggleUsuarioActivo).not.toHaveBeenCalled();
    expect(screen.queryByText('Cambiar estado del usuario')).toBeNull();
  });

  it('cambiar el rol pide confirmación con el resumen del cambio, y solo llama al backend al confirmar', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);
    fixture.detectChanges();

    await userEvent.selectOptions(screen.getByTestId('admin-users-role-select-u-1'), 'ADMIN');

    expect(mocks.adminService.actualizarRolUsuario).not.toHaveBeenCalled();
    expect(screen.getByText('Juan Pérez: Usuario → Superadmin')).toBeTruthy();

    await userEvent.click(screen.getByTestId('confirm-dialog-confirm-btn'));

    expect(mocks.adminService.actualizarRolUsuario).toHaveBeenCalledWith('org-1', 'u-1', 'ADMIN');
    expect(mocks.notification.showSuccess).toHaveBeenCalled();
  });

  it('cancelar el cambio de rol revierte el <select> sin llamar al backend', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);
    fixture.detectChanges();

    const select = screen.getByTestId('admin-users-role-select-u-1') as HTMLSelectElement;
    await userEvent.selectOptions(select, 'ADMIN');
    await userEvent.click(screen.getByTestId('confirm-dialog-cancel-btn'));

    expect(mocks.adminService.actualizarRolUsuario).not.toHaveBeenCalled();
    expect(select.value).toBe('USER');
  });

  it('si falla el cambio de rol tras confirmar, revierte el <select> y avisa (salvo error de red)', async () => {
    const mocks = makeMocks();
    mocks.adminService.actualizarRolUsuario = vi.fn(() => throwError(() => new Error('boom')));
    const { fixture } = await renderDialog(mocks);
    fixture.detectChanges();

    const select = screen.getByTestId('admin-users-role-select-u-1') as HTMLSelectElement;
    await userEvent.selectOptions(select, 'ADMIN');
    await userEvent.click(screen.getByTestId('confirm-dialog-confirm-btn'));

    expect(select.value).toBe('USER');
    expect(mocks.notification.showError).toHaveBeenCalled();
  });

  it('cambiar de organización mientras la primera carga sigue en vuelo no pisa la lista con datos de la organización vieja', async () => {
    let resolveA!: (v: AdminUserDTO[]) => void;
    const pendingA = new Promise<AdminUserDTO[]>((resolve) => { resolveA = resolve; });

    const mocks = makeMocks();
    mocks.adminService.listarUsuarios = vi.fn((orgId: string) =>
      orgId === 'org-a' ? from(pendingA) : of([user({ id: 'u-b', organizationId: 'org-b', nombre: 'Beto' })])
    );

    const { fixture } = await renderDialog(mocks, { organization: organization({ id: 'org-a' }) });
    fixture.detectChanges();

    // Cambia a la Org B (responde síncrono) ANTES de que A resuelva.
    fixture.componentRef.setInput('organization', organization({ id: 'org-b', nombre: 'Org B' }));
    fixture.detectChanges();

    expect(screen.getByTestId('admin-users-row-u-b')).toBeTruthy();

    // A llega tarde: switchMap ya debería haber descartado esta respuesta.
    resolveA([user({ id: 'u-a', organizationId: 'org-a' })]);
    await pendingA;
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(screen.queryByTestId('admin-users-row-u-a')).toBeNull();
    expect(screen.getByTestId('admin-users-row-u-b')).toBeTruthy();
  });
});
