import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API_CONFIG } from './api.config';
import { AuthResponse } from '../models/auth.model';

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

const authUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}`;

const authResponse: AuthResponse = {
  token: makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  userId: 'u1',
  username: 'jdoe',
  email: 'jdoe@example.com',
  nombre: 'Jane',
  apellido: 'Doe',
  role: 'OWNER',
  organizationId: 'org1',
  organizationNombre: 'Clinica Uno',
  organizationPais: 'AR',
  modules: ['TURNOS']
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login() hace POST a /auth/login y guarda la sesión', () => {
    let result: AuthResponse | undefined;
    service.login({ username: 'jdoe', password: 'secret' }).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${authUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(authResponse);

    expect(result).toEqual(authResponse);
    expect(localStorage.getItem('auth_token')).toBe(authResponse.token);
    expect(service.getCurrentUser()).toEqual(authResponse);
  });

  it('register() hace POST a /auth/register sin tocar la sesión', () => {
    service.register({ username: 'new', email: 'new@example.com', password: 'x', nombre: 'New' })
      .subscribe();

    const req = httpMock.expectOne(`${authUrl}/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });

    expect(service.getCurrentUser()).toBeNull();
  });

  it('verifyEmail() hace GET a /auth/verify con el token como query param', () => {
    service.verifyEmail('abc123').subscribe();

    const req = httpMock.expectOne(r => r.url === `${authUrl}/verify` && r.params.get('token') === 'abc123');
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'verified' });
  });

  it('resetPassword() hace POST a /auth/reset-password', () => {
    service.resetPassword({ token: 't', newPassword: 'newpass' }).subscribe();

    const req = httpMock.expectOne(`${authUrl}/reset-password`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });
  });

  it('logout() limpia localStorage y emite loggedOut$', () => {
    localStorage.setItem('auth_token', 'x');
    localStorage.setItem('auth_user', JSON.stringify(authResponse));

    let loggedOut = false;
    service.loggedOut$.subscribe(() => (loggedOut = true));

    service.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
    expect(loggedOut).toBe(true);
  });

  it('isAuthenticated() es true con un token vigente', () => {
    localStorage.setItem('auth_token', makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(service.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated() es false y desloguea si el token está expirado', () => {
    localStorage.setItem('auth_token', makeToken({ exp: Math.floor(Date.now() / 1000) - 10 }));
    localStorage.setItem('auth_user', JSON.stringify(authResponse));

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('isAuthenticated() es false sin token', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated() es false y desloguea si el token es inválido', () => {
    localStorage.setItem('auth_token', 'no-es-un-jwt');
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('hasRole() compara contra el usuario actual', () => {
    service.login({ username: 'jdoe', password: 'secret' }).subscribe();
    httpMock.expectOne(`${authUrl}/login`).flush(authResponse);

    expect(service.hasRole('OWNER')).toBe(true);
    expect(service.hasRole('USER')).toBe(false);
  });

  it('hasCapability() usa las capabilities del backend cuando vienen en la respuesta', () => {
    service.login({ username: 'jdoe', password: 'secret' }).subscribe();
    httpMock.expectOne(`${authUrl}/login`).flush({ ...authResponse, capabilities: ['TURNOS:VIEW'] });

    expect(service.hasCapability('TURNOS:VIEW')).toBe(true);
    expect(service.hasCapability('TURNOS:MANAGE')).toBe(false);
  });

  it('hasCapability() deriva de modules si la sesión cacheada no trae capabilities', () => {
    service.login({ username: 'jdoe', password: 'secret' }).subscribe();
    httpMock.expectOne(`${authUrl}/login`).flush(authResponse);

    expect(service.hasCapability('TURNOS:VIEW')).toBe(true);
  });

  it('hasCapability() es false sin sesión', () => {
    expect(service.hasCapability('TURNOS:VIEW')).toBe(false);
  });

  it('grantedModules() devuelve los modules de la sesión actual, o vacío sin sesión', () => {
    expect(service.grantedModules()).toEqual([]);

    service.login({ username: 'jdoe', password: 'secret' }).subscribe();
    httpMock.expectOne(`${authUrl}/login`).flush(authResponse);

    expect(service.grantedModules()).toEqual(['TURNOS']);
  });

  it('hasModule() delega en modules de la sesión actual', () => {
    service.login({ username: 'jdoe', password: 'secret' }).subscribe();
    httpMock.expectOne(`${authUrl}/login`).flush(authResponse);

    expect(service.hasModule('TURNOS')).toBe(true);
    expect(service.hasModule('ODONTOGRAMA')).toBe(false);
  });
});
