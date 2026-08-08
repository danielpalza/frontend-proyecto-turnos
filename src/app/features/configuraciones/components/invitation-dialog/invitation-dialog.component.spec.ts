import { render } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { InvitationDialogComponent } from './invitation-dialog.component';
import { InvitationService } from '../../../../core/services/invitation.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { OrganizationInvitation } from '../../../../core/models';

function invitation(overrides: Partial<OrganizationInvitation> = {}): OrganizationInvitation {
  return { id: 'inv1', token: 'ABC123', moduleCodes: ['PANEL'], usable: true, revokedAt: null, ...overrides } as OrganizationInvitation;
}

function makeMocks() {
  return {
    invitationService: {
      findAll: vi.fn(() => of([] as OrganizationInvitation[])),
      create: vi.fn(() => of(invitation())),
      revoke: vi.fn(() => of(void 0))
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: {
      getErrorMessage: vi.fn((_e: unknown, ctx: string) => `Error al ${ctx}`),
      isNetworkError: vi.fn(() => false)
    }
  };
}

async function renderDialog(mocks: ReturnType<typeof makeMocks>, inputs: Record<string, unknown> = { open: true }) {
  return render(InvitationDialogComponent, {
    inputs,
    providers: [
      { provide: InvitationService, useValue: mocks.invitationService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler }
    ]
  });
}

describe('InvitationDialogComponent', () => {
  describe('ngOnChanges: abrir el diálogo resetea el form y carga las invitaciones', () => {
    it('al abrir (open pasa a true), resetea el formulario y pide la lista', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      expect(mocks.invitationService.findAll).toHaveBeenCalled();
      expect(fixture.componentInstance.moduleCodes).toEqual([]);
      expect(fixture.componentInstance.lastCreated).toBeNull();
    });

    it('permanecer cerrado no dispara la carga', async () => {
      const mocks = makeMocks();
      await renderDialog(mocks, { open: false });

      expect(mocks.invitationService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('toggleModule', () => {
    it('agrega y quita códigos de módulo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      fixture.componentInstance.toggleModule('PANEL');
      expect(fixture.componentInstance.isModuleSelected('PANEL')).toBe(true);

      fixture.componentInstance.toggleModule('PANEL');
      expect(fixture.componentInstance.isModuleSelected('PANEL')).toBe(false);
    });
  });

  describe('generate', () => {
    it('sin ningún módulo seleccionado, marca error y no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      fixture.componentInstance.generate();

      expect(fixture.componentInstance.createError).toBe('Seleccioná al menos un módulo para el usuario invitado');
      expect(mocks.invitationService.create).not.toHaveBeenCalled();
    });

    it('con módulos seleccionados, crea la invitación y la antepone a la lista', async () => {
      const mocks = makeMocks();
      const nueva = invitation({ id: 'inv-nueva' });
      mocks.invitationService.create.mockReturnValue(of(nueva));
      mocks.invitationService.findAll.mockReturnValue(of([invitation({ id: 'inv-vieja' })]));
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.toggleModule('PANEL');

      fixture.componentInstance.generate();

      expect(fixture.componentInstance.lastCreated).toBe(nueva);
      expect(fixture.componentInstance.invitations.map(i => i.id)).toEqual(['inv-nueva', 'inv-vieja']);
      expect(fixture.componentInstance.moduleCodes).toEqual([]);
    });

    it('evita doble submit mientras hay una creación en vuelo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.toggleModule('PANEL');
      fixture.componentInstance.isCreating = true;

      fixture.componentInstance.generate();

      expect(mocks.invitationService.create).not.toHaveBeenCalled();
    });

    it('error: guarda el mensaje en createError y dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.invitationService.create.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.toggleModule('PANEL');

      fixture.componentInstance.generate();

      expect(fixture.componentInstance.createError).toBe('Error al generar la invitación');
      expect(mocks.notification.showError).toHaveBeenCalled();
    });
  });

  describe('copyToken: usa navigator.clipboard, no implementado por defecto en jsdom', () => {
    const originalClipboard = navigator.clipboard;

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    });

    it('éxito: copia y muestra un toast de éxito', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      await fixture.componentInstance.copyToken('ABC123');

      expect(writeText).toHaveBeenCalledWith('ABC123');
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Código de invitación copiado.');
    });

    it('si falla (API no disponible o rechazada), muestra el mensaje de fallback', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('no soportado'));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);

      await fixture.componentInstance.copyToken('ABC123');

      expect(mocks.notification.showError).toHaveBeenCalledWith('No se pudo copiar el código. Copiálo manualmente.');
    });
  });

  describe('revoke', () => {
    it('marca la invitación como revocada localmente sin refetch completo', async () => {
      const mocks = makeMocks();
      mocks.invitationService.findAll.mockReturnValue(of([invitation({ id: 'inv1', usable: true, revokedAt: null })]));
      const { fixture } = await renderDialog(mocks);

      fixture.componentInstance.revoke(fixture.componentInstance.invitations[0]);

      expect(mocks.invitationService.revoke).toHaveBeenCalledWith('inv1');
      expect(fixture.componentInstance.invitations[0].usable).toBe(false);
      expect(fixture.componentInstance.invitations[0].revokedAt).not.toBeNull();
      expect(mocks.notification.showSuccess).toHaveBeenCalled();
    });

    it('evita doble revocación mientras hay una en vuelo', async () => {
      const mocks = makeMocks();
      const i = invitation({ id: 'inv1' });
      mocks.invitationService.findAll.mockReturnValue(of([i]));
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.revokingId = 'inv1';

      fixture.componentInstance.revoke(i);

      expect(mocks.invitationService.revoke).not.toHaveBeenCalled();
    });
  });

  it('close emite openChange(false)', async () => {
    const openChange = vi.fn();
    const mocks = makeMocks();
    await render(InvitationDialogComponent, {
      inputs: { open: true },
      on: { openChange },
      providers: [
        { provide: InvitationService, useValue: mocks.invitationService },
        { provide: NotificationService, useValue: mocks.notification },
        { provide: ErrorHandlerService, useValue: mocks.errorHandler }
      ]
    }).then(({ fixture }) => fixture.componentInstance.close());

    expect(openChange).toHaveBeenCalledWith(false);
  });

  it('moduleIcon devuelve un ícono de fallback para códigos desconocidos', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);

    expect(fixture.componentInstance.moduleIcon('PANEL')).toBe('bi-speedometer2');
    expect(fixture.componentInstance.moduleIcon('ALGO_NUEVO')).toBe('bi-app-indicator');
  });
});
