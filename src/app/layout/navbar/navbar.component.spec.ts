import { render } from '@testing-library/angular';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ClinicalAttentionService, LastAttention } from '../../core/services/clinical-attention.service';
import { NotificationService } from '../../core/services/notification.service';
import { ModuleRulesService } from '../../core/services/module-rules.service';
import { Capability } from '../../core/auth/capabilities';
import { createAuthServiceMock } from '../../../testing/auth-service.mock';

function makeMocks(overrides: { hasCapability?: (c: string) => boolean; clinicalModules?: unknown[] } = {}) {
  return {
    auth: createAuthServiceMock({
      hasCapability: vi.fn(overrides.hasCapability ?? (() => true)),
      hasRole: vi.fn(() => false),
      getCurrentUser: vi.fn(() => ({ organizationNombre: 'Clínica X', nombre: 'Ana', apellido: 'García' })),
      logout: vi.fn()
    }),
    clinicalAttention: { getLast: vi.fn((): LastAttention | null => null) },
    notification: { showInfo: vi.fn() },
    moduleRulesService: { getClinicalModules: vi.fn(() => of(overrides.clinicalModules ?? [])) }
  };
}

async function renderNavbar(mocks: ReturnType<typeof makeMocks>) {
  const result = await render(NavbarComponent, {
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: mocks.auth },
      { provide: ClinicalAttentionService, useValue: mocks.clinicalAttention },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ModuleRulesService, useValue: mocks.moduleRulesService }
    ]
  });

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);

  return { ...result, router };
}

function setRouterUrl(router: Router, url: string) {
  Object.defineProperty(router, 'url', { get: () => url, configurable: true });
}

describe('NavbarComponent', () => {
  it('un error al cargar los módulos clínicos no rompe el componente (solo console.error)', async () => {
    const mocks = makeMocks();
    mocks.moduleRulesService.getClinicalModules.mockReturnValue(throwError(() => new Error('falló')));

    const { fixture } = await renderNavbar(mocks);

    expect(fixture.componentInstance.menuItems.some(i => i.title === 'Atención')).toBe(false);
  });

  it('la pestaña "Atención" aparece si el usuario tiene VIEW sobre CUALQUIERA de los módulos clínicos cargados', async () => {
    const mocks = makeMocks({
      hasCapability: c => c === 'HISTORIA_CLINICA_FREE:VIEW',
      clinicalModules: [{ codigo: 'ODONTOGRAMA' }, { codigo: 'HISTORIA_CLINICA_FREE' }]
    });

    const { fixture } = await renderNavbar(mocks);

    expect(fixture.componentInstance.menuItems.some(i => i.title === 'Atención')).toBe(true);
  });

  it('sin capacidad sobre ningún módulo clínico, "Atención" no aparece', async () => {
    const mocks = makeMocks({
      hasCapability: () => false,
      clinicalModules: [{ codigo: 'ODONTOGRAMA' }]
    });

    const { fixture } = await renderNavbar(mocks);
    expect(fixture.componentInstance.menuItems.some(i => i.title === 'Atención')).toBe(false);
  });

  it('menuItems solo incluye los ítems estáticos cuya capacidad el usuario tiene', async () => {
    const mocks = makeMocks({ hasCapability: c => c === Capability.PANEL_VIEW });
    const { fixture } = await renderNavbar(mocks);

    const titles = fixture.componentInstance.menuItems.map(i => i.title);
    expect(titles).toEqual(['Panel']);
  });

  it('onNavClick de Atención con último turno atendido: navega directo, sin toast', async () => {
    const mocks = makeMocks();
    mocks.clinicalAttention.getLast.mockReturnValue({ appointmentId: 'apt-1', rutaClinica: 'odontograma' } as LastAttention);
    const { fixture, router } = await renderNavbar(mocks);

    const event = { preventDefault: vi.fn() } as unknown as Event;
    fixture.componentInstance.onNavClick({ title: 'Atención', icon: '', requiresAppointment: true, capability: '' }, event);

    expect(router.navigate).toHaveBeenCalledWith(['/odontograma', 'apt-1']);
    expect(mocks.notification.showInfo).not.toHaveBeenCalled();
  });

  it('onNavClick de Atención sin último turno: muestra un toast informativo y va a /turnos', async () => {
    const mocks = makeMocks();
    const { fixture, router } = await renderNavbar(mocks);

    const event = { preventDefault: vi.fn() } as unknown as Event;
    fixture.componentInstance.onNavClick({ title: 'Atención', icon: '', requiresAppointment: true, capability: '' }, event);

    expect(mocks.notification.showInfo).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/turnos']);
  });

  it('userFullName/organizationNombre son null-safe sin usuario', async () => {
    const mocks = makeMocks();
    mocks.auth.getCurrentUser.mockReturnValue(null as never);
    const { fixture } = await renderNavbar(mocks);

    expect(fixture.componentInstance.userFullName).toBeNull();
    expect(fixture.componentInstance.organizationNombre).toBeNull();
  });

  it('isAtencionActive compara router.url contra la rutaClinica de los módulos cargados', async () => {
    const mocks = makeMocks({ clinicalModules: [{ codigo: 'ODONTOGRAMA', rutaClinica: 'odontograma' }] });
    const { fixture, router } = await renderNavbar(mocks);
    setRouterUrl(router, '/odontograma/apt-1');

    expect(fixture.componentInstance.isAtencionActive()).toBe(true);
  });

  it('logout() delega en AuthService y navega a /login', async () => {
    const mocks = makeMocks();
    const { fixture, router } = await renderNavbar(mocks);

    fixture.componentInstance.logout();

    expect(mocks.auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
