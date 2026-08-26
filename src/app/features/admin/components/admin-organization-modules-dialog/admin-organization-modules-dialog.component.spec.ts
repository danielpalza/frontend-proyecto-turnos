import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AdminOrganizationModulesDialogComponent } from './admin-organization-modules-dialog.component';
import { OrganizationAdminDTO, ModuleGrantDTO } from '../../admin.models';

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

function moduleGrant(codigo: string, activo = true): ModuleGrantDTO {
  return { codigo, nombre: codigo, activo, fechaVencimiento: null };
}

async function renderDialog(
  inputs: Record<string, unknown> = {},
  on: Record<string, (...args: any[]) => void> = {}
) {
  return render(AdminOrganizationModulesDialogComponent, {
    inputs: { open: true, organization: organization(), ...inputs },
    on
  });
}

describe('AdminOrganizationModulesDialogComponent', () => {

  it('cerrado no renderiza el diálogo', async () => {
    await render(AdminOrganizationModulesDialogComponent, {
      inputs: { open: false, organization: organization() }
    });

    expect(screen.queryByTestId('admin-modules-dialog')).toBeNull();
  });

  it('al abrir, los módulos activos de la organización aparecen preseleccionados', async () => {
    await renderDialog({
      organization: organization({ modules: [moduleGrant('PANEL'), moduleGrant('TURNOS')] })
    });

    expect(screen.getByTestId('admin-modules-module-PANEL').className).toContain('selected');
    expect(screen.getByTestId('admin-modules-module-TURNOS').className).toContain('selected');
    expect(screen.getByTestId('admin-modules-module-ODONTOGRAMA').className).not.toContain('selected');
  });

  it('un módulo con fechaVencimiento pero activo=false no queda preseleccionado', async () => {
    await renderDialog({
      organization: organization({ modules: [moduleGrant('PANEL', false)] })
    });

    expect(screen.getByTestId('admin-modules-module-PANEL').className).not.toContain('selected');
  });

  it('click en un módulo no seleccionado lo agrega; click en uno seleccionado lo saca', async () => {
    await renderDialog({ organization: organization({ modules: [moduleGrant('PANEL')] }) });

    await userEvent.click(screen.getByTestId('admin-modules-module-TURNOS'));
    expect(screen.getByTestId('admin-modules-module-TURNOS').className).toContain('selected');

    await userEvent.click(screen.getByTestId('admin-modules-module-PANEL'));
    expect(screen.getByTestId('admin-modules-module-PANEL').className).not.toContain('selected');
  });

  it('guardar emite save con la lista actual de códigos', async () => {
    const save = vi.fn();
    await renderDialog({ organization: organization({ modules: [moduleGrant('PANEL')] }) }, { save });

    await userEvent.click(screen.getByTestId('admin-modules-module-TURNOS'));
    await userEvent.click(screen.getByTestId('admin-modules-save-btn'));

    expect(save).toHaveBeenCalledWith(['PANEL', 'TURNOS']);
  });

  it('isSaving=true deshabilita guardar y cambia el texto del botón', async () => {
    await renderDialog({ isSaving: true });

    const btn = screen.getByTestId('admin-modules-save-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Guardando...');
  });

  it('saveError (input) se muestra', async () => {
    await renderDialog({ saveError: 'No se pudo guardar' });

    expect(screen.getByTestId('admin-modules-save-error').textContent).toContain('No se pudo guardar');
  });

  it('cerrar con isSaving=true SÍ emite openChange (a diferencia del diálogo de plan: close() no chequea isSaving acá)', async () => {
    const openChange = vi.fn();
    await renderDialog({ isSaving: true }, { openChange });

    await userEvent.click(screen.getByTestId('admin-modules-close-btn'));

    expect(openChange).toHaveBeenCalledWith(false);
  });
});
