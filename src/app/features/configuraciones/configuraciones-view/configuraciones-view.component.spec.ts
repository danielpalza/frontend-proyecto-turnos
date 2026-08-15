import { render, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { ConfiguracionesViewComponent } from './configuraciones-view.component';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ProfesionalService } from '../../../core/services/profesional.service';
import { AuthService } from '../../../core/services/auth.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { SubscriptionService } from '../../../core/services/subscription.service';

function makeMocks(overrides: { configPatch?: { mensajeWhatsapp?: string } | null } = {}) {
  return {
    configurationService: {
      getMensajeWhatsapp: vi.fn(() => ''),
      getConfig: vi.fn(() => of(overrides.configPatch ?? null)),
      saveMensajeWhatsapp: vi.fn(() => of(void 0))
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: {
      getErrorMessage: vi.fn((_e: unknown, ctx: string) => `Error al ${ctx}`),
      isNetworkError: vi.fn(() => false)
    },
    profesionalService: { getProfesionales: vi.fn(() => of([])) },
    authService: {
      hasCapability: vi.fn(() => true),
      hasRole: vi.fn(() => false),
      grantedModules: vi.fn(() => [] as string[]),
      currentUser$: of({})
    },
    invitationService: { findAll: vi.fn(() => of([])) },
    // La vista renderiza <app-suscripcion-panel>, que inyecta SubscriptionService. Sin este mock
    // se instancia el real, que se suscribe a auth.loggedOut$ (ausente en el mock) y revienta.
    subscriptionService: {
      getSubscription: vi.fn(() => of(null)),
      getPlanes: vi.fn(() => of([])),
      getHistorialPagos: vi.fn(() => of([]))
    }
  };
}

async function renderView(mocks: ReturnType<typeof makeMocks>) {
  return render(ConfiguracionesViewComponent, {
    providers: [
      { provide: ConfigurationService, useValue: mocks.configurationService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler },
      { provide: ProfesionalService, useValue: mocks.profesionalService },
      { provide: AuthService, useValue: mocks.authService },
      { provide: InvitationService, useValue: mocks.invitationService },
      { provide: SubscriptionService, useValue: mocks.subscriptionService }
    ]
  });
}

describe('ConfiguracionesViewComponent', () => {
  describe('ngOnInit: carga inicial de la plantilla', () => {
    it('usa el mensaje guardado localmente y lo reemplaza si el servidor trae uno propio', async () => {
      const mocks = makeMocks({ configPatch: { mensajeWhatsapp: 'Hola {paciente}!' } });
      mocks.configurationService.getMensajeWhatsapp.mockReturnValue('valor local');
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.whatsappTemplate).toBe('Hola {paciente}!');
    });

    it('si el servidor no trae mensajeWhatsapp, conserva el valor local', async () => {
      const mocks = makeMocks({ configPatch: {} });
      mocks.configurationService.getMensajeWhatsapp.mockReturnValue('valor local');
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.whatsappTemplate).toBe('valor local');
    });
  });

  describe('whatsappCharCount: mide el mensaje interpolado, no la plantilla cruda', () => {
    it('un token corto que expande a texto largo cuenta el texto expandido', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.whatsappTemplate = '{profesional}';

      expect(fixture.componentInstance.whatsappCharCount).toBe('Diego Suarez'.length);
    });

    it('texto sin tokens cuenta literal', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.whatsappTemplate = 'hola';

      expect(fixture.componentInstance.whatsappCharCount).toBe(4);
    });

    it('whatsappCharsRemaining/whatsappCharPercent derivan del mismo conteo interpolado', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.whatsappTemplate = 'hola';

      expect(fixture.componentInstance.whatsappCharsRemaining).toBe(1024 - 4);
      expect(fixture.componentInstance.whatsappCharPercent).toBeCloseTo((4 / 1024) * 100);
    });
  });

  describe('whatsappPreviewParts', () => {
    it('separa el texto en partes literales y resaltadas para cada token', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.whatsappTemplate = 'Hola {paciente}, tu turno es {hora}.';

      const parts = fixture.componentInstance.whatsappPreviewParts;

      expect(parts).toEqual([
        { text: 'Hola ', highlight: false },
        { text: 'María García', highlight: true },
        { text: ', tu turno es ', highlight: false },
        { text: '10:30', highlight: true },
        { text: '.', highlight: false }
      ]);
    });
  });

  describe('insertWhatsappPlaceholder', () => {
    it('sin textarea disponible, agrega el token al final y trunca al máximo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.whatsappTemplate = 'hola';
      fixture.componentInstance.whatsappTemplateInput = undefined;

      fixture.componentInstance.insertWhatsappPlaceholder('paciente');

      expect(fixture.componentInstance.whatsappTemplate).toBe('hola{paciente}');
    });

    it('con textarea disponible, inserta en la posición del cursor', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.whatsappTemplate = 'Hola , bienvenido';
      const textarea = { selectionStart: 5, selectionEnd: 5, focus: vi.fn(), setSelectionRange: vi.fn() };
      fixture.componentInstance.whatsappTemplateInput = { nativeElement: textarea } as never;

      fixture.componentInstance.insertWhatsappPlaceholder('paciente');

      expect(fixture.componentInstance.whatsappTemplate).toBe('Hola {paciente}, bienvenido');
    });

    it('trunca al largo máximo aunque haya textarea', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.whatsappTemplate = 'x'.repeat(1020);
      const textarea = { selectionStart: 1020, selectionEnd: 1020, focus: vi.fn(), setSelectionRange: vi.fn() };
      fixture.componentInstance.whatsappTemplateInput = { nativeElement: textarea } as never;

      fixture.componentInstance.insertWhatsappPlaceholder('paciente');

      expect(fixture.componentInstance.whatsappTemplate).toHaveLength(1024);
    });
  });

  it('restoreDefaultWhatsappTemplate restaura la plantilla por defecto', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderView(mocks);
    fixture.componentInstance.whatsappTemplate = 'algo distinto';

    fixture.componentInstance.restoreDefaultWhatsappTemplate();

    expect(fixture.componentInstance.whatsappTemplate).toBe(fixture.componentInstance.whatsappPlaceholder);
  });

  describe('saveWhatsappTemplate', () => {
    it('éxito: marca whatsappSaved y un timer de 3000ms lo vuelve a false', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.saveWhatsappTemplate();
      expect(fixture.componentInstance.whatsappSaved).toBe(true);

      vi.advanceTimersByTime(2999);
      expect(fixture.componentInstance.whatsappSaved).toBe(true);

      vi.advanceTimersByTime(1);
      expect(fixture.componentInstance.whatsappSaved).toBe(false);

      vi.useRealTimers();
    });

    it('error: no marca whatsappSaved y dispara el toast (salvo error de red)', async () => {
      const mocks = makeMocks();
      mocks.configurationService.saveMensajeWhatsapp.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.saveWhatsappTemplate();

      expect(fixture.componentInstance.whatsappSaved).toBe(false);
      expect(mocks.notification.showError).toHaveBeenCalled();
    });

    it('error de red: no dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.errorHandler.isNetworkError.mockReturnValue(true);
      mocks.configurationService.saveMensajeWhatsapp.mockReturnValue(throwError(() => new Error('caída de red')));
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.saveWhatsappTemplate();

      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });

    it('BUG (DEUDA § 4.3): el estado se actualiza correctamente, pero el mensaje "Configuracion guardada" no aparece en el DOM sin un detectChanges manual — a diferencia de ngOnInit, esta rama next: no llama a cdr.markForCheck()', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.saveWhatsappTemplate();

      // (1) El estado interno sí se actualiza correctamente.
      expect(fixture.componentInstance.whatsappSaved).toBe(true);
      // (2) Pero el *ngIf="whatsappSaved" del template no se refleja sin un ciclo de detección manual:
      // esa es la causa raíz documentada en DEUDA_TECNICA.md § 4.3 (tercera instancia del patrón).
      expect(screen.queryByText('Configuracion guardada')).toBeNull();

      fixture.detectChanges(false);
      expect(screen.queryByText('Configuracion guardada')).toBeTruthy();
    });
  });
});
