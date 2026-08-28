import { of, Subject } from 'rxjs';
import type { Mocked } from 'vitest';
import { AuthService } from '../app/core/services/auth.service';
import { AuthResponse, MessageResponse } from '../app/core/models';

/**
 * Mock compartido de AuthService para specs. Reemplaza a los ~26 objetos literales
 * ad hoc que existian antes, uno por spec, sin relacion de tipos con la clase real
 * (ver docs/TESTING.md, entrada 2026-08-28).
 *
 * Cualquier metodo de AuthService que no este contemplado en `defaults` (tipicamente
 * porque se agrego despues a la clase real y este archivo no se actualizo) devuelve un
 * vi.fn() no-op via el Proxy, en vez de `undefined` explotando con "is not a function".
 * Es la barrera real contra repetir el incidente de `hasRole` (commit 7ffedb7) en el
 * proximo metodo nuevo que se agregue a AuthService.
 */
export function createAuthServiceMock<T extends Record<string, unknown> = Record<string, unknown>>(
  overrides: T = {} as T
): Mocked<AuthService> & T {
  const defaults: Record<string, unknown> = {
    currentUser$: of(null as AuthResponse | null),
    loggedOut$: new Subject<void>(),
    login: vi.fn(() => of({} as AuthResponse)),
    register: vi.fn(() => of({ message: '' } as MessageResponse)),
    verifyEmail: vi.fn(() => of({ message: '' } as MessageResponse)),
    resendVerification: vi.fn(() => of({ message: '' } as MessageResponse)),
    forgotPassword: vi.fn(() => of({ message: '' } as MessageResponse)),
    resetPassword: vi.fn(() => of({ message: '' } as MessageResponse)),
    logout: vi.fn(),
    getToken: vi.fn(() => null),
    isAuthenticated: vi.fn(() => false),
    getCurrentUser: vi.fn(() => null),
    hasRole: vi.fn(() => false),
    hasModule: vi.fn(() => false),
    hasCapability: vi.fn(() => true),
    grantedModules: vi.fn(() => [] as string[]),
    ...overrides
  };

  return new Proxy(defaults, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && !(prop in target)) {
        target[prop] = vi.fn();
      }
      return Reflect.get(target, prop, receiver);
    }
  }) as unknown as Mocked<AuthService> & T;
}
