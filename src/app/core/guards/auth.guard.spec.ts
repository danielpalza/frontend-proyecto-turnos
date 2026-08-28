import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Mocked } from 'vitest';
import { authGuard, homeRedirect } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { Capability } from '../auth/capabilities';
import { createAuthServiceMock } from '../../../testing/auth-service.mock';

describe('authGuard', () => {
  let authService: Mocked<AuthService>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = createAuthServiceMock({
      isAuthenticated: vi.fn(() => true),
      hasCapability: vi.fn(() => true),
      hasRole: vi.fn(() => false)
    });
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  function runGuard(routeData: Record<string, unknown> = {}) {
    return TestBed.runInInjectionContext(() => authGuard({ data: routeData } as any, {} as any));
  }

  it('sin sesión: redirige a /login y devuelve false', () => {
    authService.isAuthenticated.mockReturnValue(false);
    expect(runGuard()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('con sesión y sin capability requerida: deja pasar', () => {
    expect(runGuard()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('con sesión y capability requerida que el usuario tiene: deja pasar', () => {
    authService.hasCapability.mockReturnValue(true);
    expect(runGuard({ capability: Capability.TURNOS_VIEW })).toBe(true);
  });

  it('con sesión y capability requerida que el usuario NO tiene: redirige a /403', () => {
    authService.hasCapability.mockReturnValue(false);
    expect(runGuard({ capability: Capability.TURNOS_VIEW })).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/403']);
  });
});

describe('homeRedirect', () => {
  let authService: Mocked<AuthService>;

  beforeEach(() => {
    authService = createAuthServiceMock({
      isAuthenticated: vi.fn(() => true),
      hasCapability: vi.fn(() => false),
      hasRole: vi.fn(() => false)
    });
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }]
    });
  });

  function runHomeRedirect(): string {
    return TestBed.runInInjectionContext(() => homeRedirect());
  }

  it('sin sesión: devuelve /login', () => {
    authService.isAuthenticated.mockReturnValue(false);
    expect(runHomeRedirect()).toBe('/login');
  });

  it('con sesión y ninguna capacidad de aterrizaje: devuelve /403', () => {
    expect(runHomeRedirect()).toBe('/403');
  });

  it('con sesión y solo SEGUIMIENTO:VIEW: saltea panel y turnos, devuelve /seguimiento', () => {
    authService.hasCapability.mockImplementation((c: string) => c === Capability.SEGUIMIENTO_VIEW);
    expect(runHomeRedirect()).toBe('/seguimiento');
  });

  it('con sesión y PANEL:VIEW entre otras: gana la primera coincidencia (/panel)', () => {
    authService.hasCapability.mockImplementation(
      (c: string) => c === Capability.PANEL_VIEW || c === Capability.TURNOS_VIEW
    );
    expect(runHomeRedirect()).toBe('/panel');
  });
});
