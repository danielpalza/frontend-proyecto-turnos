import { render } from '@testing-library/angular';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { ProfesionalesPanelComponent } from './profesionales-panel.component';
import { ProfesionalService } from '../../../../core/services/profesional.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { InvitationService } from '../../../../core/services/invitation.service';
import { Profesional, ProfesionalCreateDTO } from '../../../../core/models';
import { Capability } from '../../../../core/auth/capabilities';
import { createAuthServiceMock } from '../../../../../testing/auth-service.mock';

function profesional(overrides: Partial<Profesional> = {}): Profesional {
  return { id: 'p1', nombre: 'Ana', apellido: 'García', activo: true, ...overrides } as Profesional;
}

function makeMocks(overrides: { capabilities?: string[] } = {}) {
  const capabilities = new Set(overrides.capabilities ?? [
    Capability.INVITACIONES_MANAGE, Capability.PROFESIONALES_MANAGE, Capability.PROFESIONALES_DELETE
  ]);
  return {
    profesionalService: {
      getProfesionales: vi.fn(() => of([] as Profesional[])),
      create: vi.fn(() => of(profesional())),
      update: vi.fn(() => of(profesional())),
      delete: vi.fn(() => of(void 0)),
      toggleActive: vi.fn(() => of(profesional()))
    },
    authService: createAuthServiceMock({
      hasCapability: vi.fn((c: string) => capabilities.has(c)),
      hasRole: vi.fn(() => false),
      grantedModules: vi.fn(() => [] as string[]),
      currentUser$: of({})
    }),
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: {
      getErrorMessage: vi.fn((_e: unknown, ctx: string) => `Error al ${ctx}`),
      isNetworkError: vi.fn(() => false)
    },
    invitationService: { findAll: vi.fn(() => of([])) }
  };
}

async function renderPanel(mocks: ReturnType<typeof makeMocks>) {
  return render(ProfesionalesPanelComponent, {
    providers: [
      { provide: ProfesionalService, useValue: mocks.profesionalService },
      { provide: AuthService, useValue: mocks.authService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler },
      { provide: InvitationService, useValue: mocks.invitationService }
    ]
  });
}

describe('ProfesionalesPanelComponent', () => {
  describe('capacidades', () => {
    it('canInvite/canManage/canDelete reflejan las capacidades del usuario', async () => {
      const mocks = makeMocks({ capabilities: [Capability.PROFESIONALES_MANAGE] });
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.canInvite).toBe(false);
      expect(fixture.componentInstance.canManage).toBe(true);
      expect(fixture.componentInstance.canDelete).toBe(false);
    });
  });

  describe('ngOnInit: carga de profesionales', () => {
    it('carga la lista exitosamente', async () => {
      const lista = [profesional()];
      const mocks = makeMocks();
      mocks.profesionalService.getProfesionales.mockReturnValue(of(lista));
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.profesionales).toEqual(lista);
    });

    it('error 404 se ignora en silencio', async () => {
      const mocks = makeMocks();
      mocks.profesionalService.getProfesionales.mockReturnValue(throwError(() => ({ status: 404 })));
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.profesionales).toEqual([]);
      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });

    it('otro error dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.profesionalService.getProfesionales.mockReturnValue(throwError(() => ({ status: 500 })));
      await renderPanel(mocks);

      expect(mocks.notification.showError).toHaveBeenCalled();
    });
  });

  describe('helpers de presentación', () => {
    it('getProfesionalInitials: una palabra usa sus 2 primeras letras, sin nombre da "?"', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.getProfesionalInitials('Madonna')).toBe('MA');
      expect(fixture.componentInstance.getProfesionalInitials('Ana García')).toBe('AG');
      expect(fixture.componentInstance.getProfesionalInitials('')).toBe('?');
    });

    it('getProfesionalDetalle incluye el documento solo si existe', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.getProfesionalDetalle(profesional({ identificacion: '12345678' }))).toBe('Doc 12345678');
      expect(fixture.componentInstance.getProfesionalDetalle(profesional({ identificacion: undefined }))).toBe('');
    });

    it('getAvatarStyle cicla la paleta de 3 colores', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.getAvatarStyle(0)).toEqual(fixture.componentInstance.getAvatarStyle(3));
      expect(fixture.componentInstance.getAvatarStyle(0)).not.toEqual(fixture.componentInstance.getAvatarStyle(1));
    });
  });

  describe('modales', () => {
    it('openInviteUser/closeInviteUser togglean showInvitationDialog', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.openInviteUser();
      expect(fixture.componentInstance.showInvitationDialog).toBe(true);

      fixture.componentInstance.closeInviteUser();
      expect(fixture.componentInstance.showInvitationDialog).toBe(false);
    });

    it('openAddProfesional limpia el estado de edición y abre el form', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.saveProfesionalError = 'error viejo';

      fixture.componentInstance.openAddProfesional();

      expect(fixture.componentInstance.editingProfesional).toBeNull();
      expect(fixture.componentInstance.saveProfesionalError).toBe('');
      expect(fixture.componentInstance.showProfesionalForm).toBe(true);
    });

    it('openEditProfesional precarga el profesional a editar', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      const p = profesional();

      fixture.componentInstance.openEditProfesional(p);

      expect(fixture.componentInstance.editingProfesional).toBe(p);
      expect(fixture.componentInstance.showProfesionalForm).toBe(true);
    });

    it('closeAddProfesional resetea todo el estado del form, incluido isSavingProfesional', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.editingProfesional = profesional();
      fixture.componentInstance.isSavingProfesional = true;

      fixture.componentInstance.closeAddProfesional();

      expect(fixture.componentInstance.showProfesionalForm).toBe(false);
      expect(fixture.componentInstance.editingProfesional).toBeNull();
      expect(fixture.componentInstance.isSavingProfesional).toBe(false);
    });
  });

  describe('onSaveProfesional', () => {
    const dto: ProfesionalCreateDTO = { nombre: 'Ana', apellido: 'García' } as ProfesionalCreateDTO;

    it('sin profesional en edición, crea uno nuevo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.onSaveProfesional(dto);

      expect(mocks.profesionalService.create).toHaveBeenCalledWith(dto);
      expect(mocks.profesionalService.update).not.toHaveBeenCalled();
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Profesional creado correctamente.');
      expect(fixture.componentInstance.showProfesionalForm).toBe(false);
    });

    it('con profesional en edición, llama a update() (no a create())', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.editingProfesional = profesional({ id: 'p1' });

      fixture.componentInstance.onSaveProfesional(dto);

      expect(mocks.profesionalService.update).toHaveBeenCalledWith('p1', dto);
      expect(mocks.profesionalService.create).not.toHaveBeenCalled();
    });

    it('BUG: el toast de éxito siempre dice "creado", incluso al actualizar — closeAddProfesional() limpia editingProfesional ANTES de que el ternario del mensaje lo lea', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.editingProfesional = profesional({ id: 'p1' });

      fixture.componentInstance.onSaveProfesional(dto);

      expect(mocks.profesionalService.update).toHaveBeenCalled();
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Profesional creado correctamente.');
    });

    it('evita doble submit mientras hay un guardado en vuelo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.isSavingProfesional = true;

      fixture.componentInstance.onSaveProfesional(dto);

      expect(mocks.profesionalService.create).not.toHaveBeenCalled();
    });

    it('error de guardado llama markForCheck para pintar el mensaje en zoneless', async () => {
      const mocks = makeMocks();
      mocks.profesionalService.create.mockReturnValue(throwError(() => ({ status: 409 })));
      const { fixture } = await renderPanel(mocks);
      const cdr = (fixture.componentInstance as unknown as { cdr: ChangeDetectorRef }).cdr;
      const markForCheckSpy = vi.spyOn(cdr, 'markForCheck');

      fixture.componentInstance.onSaveProfesional(dto);

      expect(fixture.componentInstance.isSavingProfesional).toBe(false);
      expect(fixture.componentInstance.saveProfesionalError).toBe('Error al crear el profesional');
      expect(markForCheckSpy).toHaveBeenCalled();
    });
  });

  describe('eliminar profesional', () => {
    it('onDeleteProfesional sin id no abre el diálogo de confirmación', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.onDeleteProfesional(profesional({ id: undefined }));

      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(false);
    });

    it('openDeleteConfirm es no-op mientras ya se está eliminando', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.isDeletingProfesional = true;

      fixture.componentInstance.openDeleteConfirm(profesional());

      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(false);
    });

    it('closeDeleteConfirm es no-op mientras se está eliminando', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.isDeleteConfirmOpen = true;
      fixture.componentInstance.isDeletingProfesional = true;

      fixture.componentInstance.closeDeleteConfirm();

      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(true);
    });

    it('confirmDeleteProfesional éxito cierra el diálogo y avisa', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.deleteCandidate = profesional({ id: 'p1' });
      fixture.componentInstance.isDeleteConfirmOpen = true;

      fixture.componentInstance.confirmDeleteProfesional();

      expect(mocks.profesionalService.delete).toHaveBeenCalledWith('p1');
      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(false);
      expect(fixture.componentInstance.deleteCandidate).toBeNull();
      expect(mocks.notification.showSuccess).toHaveBeenCalled();
    });

    it('confirmDeleteProfesional error mantiene el diálogo abierto', async () => {
      const mocks = makeMocks();
      mocks.profesionalService.delete.mockReturnValue(throwError(() => ({ status: 500 })));
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.deleteCandidate = profesional({ id: 'p1' });
      fixture.componentInstance.isDeleteConfirmOpen = true;

      fixture.componentInstance.confirmDeleteProfesional();

      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(true);
      expect(mocks.notification.showError).toHaveBeenCalled();
    });
  });

  describe('toggleProfesionalActive', () => {
    it('sin id, no hace nada', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.toggleProfesionalActive(profesional({ id: undefined }));

      expect(mocks.profesionalService.toggleActive).not.toHaveBeenCalled();
    });

    it('activo -> el toast dice "desactivado"; inactivo -> dice "activado"', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.toggleProfesionalActive(profesional({ id: 'p1', activo: true }));
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Profesional desactivado correctamente.');

      fixture.componentInstance.toggleProfesionalActive(profesional({ id: 'p2', activo: false }));
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Profesional activado correctamente.');
    });

    it('evita doble toggle mientras hay uno en vuelo', async () => {
      const mocks = makeMocks();
      mocks.profesionalService.toggleActive.mockReturnValue(new Subject());
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.toggleProfesionalActive(profesional({ id: 'p1' }));
      fixture.componentInstance.toggleProfesionalActive(profesional({ id: 'p1' }));

      expect(mocks.profesionalService.toggleActive).toHaveBeenCalledTimes(1);
    });
  });
});
