import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { httpErrorInterceptor } from './http-error.interceptor';
import { skipGlobalErrorHandler } from './http-context';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { NotificationService } from '../services/notification.service';
import { createAuthServiceMock } from '../../../testing/auth-service.mock';
import type { Mocked } from 'vitest';

describe('httpErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: Mocked<AuthService>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let errorHandler: { getErrorMessage: ReturnType<typeof vi.fn>; isNetworkError: ReturnType<typeof vi.fn> };
  let notification: { showError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = createAuthServiceMock({ hasCapability: vi.fn(() => false), logout: vi.fn() });
    router = { navigate: vi.fn() };
    errorHandler = { getErrorMessage: vi.fn(() => 'mensaje'), isNetworkError: vi.fn(() => false) };
    notification = { showError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ErrorHandlerService, useValue: errorHandler },
        { provide: NotificationService, useValue: notification }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function fireRequest(url: string, status: number, body: Record<string, unknown> = {}, context?: ReturnType<typeof skipGlobalErrorHandler>) {
    let caught: unknown;
    httpClient.get(url, context ? { context } : undefined).subscribe({ error: err => (caught = err) });
    httpMock.expectOne(url).flush(body, { status, statusText: 'Error' });
    return () => caught;
  }

  it('403 fuera de /auth/ con requiredCapability que el usuario ya tiene: fuerza logout (sesión desactualizada)', () => {
    authService.hasCapability.mockReturnValue(true);
    fireRequest('/api/turnos', 403, { requiredCapability: 'TURNOS:VIEW', message: 'Sin permiso' })();

    expect(notification.showError).toHaveBeenCalledWith('Tus permisos cambiaron. Iniciá sesión de nuevo para continuar.');
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('403 fuera de /auth/ con requiredCapability que el usuario NO tiene: solo avisa, sin logout', () => {
    authService.hasCapability.mockReturnValue(false);
    fireRequest('/api/turnos', 403, { requiredCapability: 'TURNOS:VIEW', message: 'Sin permiso para esto' })();

    expect(notification.showError).toHaveBeenCalledWith('Sin permiso para esto');
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('403 sin requiredCapability en el body: avisa sin cerrar la sesión', () => {
    // Sin ese campo no hay capacidad desactualizada: es una baranda de rol o de módulo, no una
    // sesión vencida. Cerrar sesión ahí expulsaba a quien pisaba el panel superadmin.
    fireRequest('/api/turnos', 403, {})();

    expect(notification.showError).toHaveBeenCalledWith(
      'No tenés permiso para realizar esta acción'
    );
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('403 en un endpoint /auth/*: pasa de largo, sin logout ni notificación', () => {
    fireRequest('/api/auth/login', 403, { requiredCapability: 'X' })();

    expect(notification.showError).not.toHaveBeenCalled();
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('401 fuera de /auth/: logout + redirect a login', () => {
    fireRequest('/api/turnos', 401)();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('401 en /auth/* (ej. password incorrecta): no dispara logout global', () => {
    fireRequest('/api/auth/login', 401)();

    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('error no 401/403/404 con skipGlobalErrorHandler activo: no notifica', () => {
    const getCaught = fireRequest('/api/patients', 500, {}, skipGlobalErrorHandler());

    expect(notification.showError).not.toHaveBeenCalled();
    expect(getCaught()).toBeTruthy();
  });

  it('error no 401/403/404 sin skip, de red: no notifica', () => {
    errorHandler.isNetworkError.mockReturnValue(true);
    fireRequest('/api/patients', 500)();

    expect(notification.showError).not.toHaveBeenCalled();
  });

  it('error no 401/403/404 sin skip, no es de red: notifica con el mensaje del ErrorHandlerService', () => {
    errorHandler.isNetworkError.mockReturnValue(false);
    errorHandler.getErrorMessage.mockReturnValue('Error al cargar los pacientes');
    fireRequest('/api/patients', 500)();

    expect(notification.showError).toHaveBeenCalledWith('Error al cargar los pacientes');
  });

  it('404: nunca notifica, con o sin skip', () => {
    fireRequest('/api/patients/999', 404)();
    expect(notification.showError).not.toHaveBeenCalled();
  });
});
