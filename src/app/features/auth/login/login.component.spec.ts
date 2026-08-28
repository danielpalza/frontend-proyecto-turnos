import { render } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { Capability } from '../../../core/auth/capabilities';
import { NotificationService } from '../../../core/services/notification.service';
import { RegisterRequest } from '../../../core/models/auth.model';
import { createAuthServiceMock } from '../../../../testing/auth-service.mock';

function makeMocks(overrides: { isAuthenticated?: boolean } = {}) {
  return {
    router: { navigate: vi.fn(), navigateByUrl: vi.fn() },
    auth: createAuthServiceMock({
      isAuthenticated: vi.fn(() => overrides.isAuthenticated ?? false),
      hasRole: vi.fn(() => false),
      hasCapability: vi.fn((c: string) => c === Capability.TURNOS_VIEW),
      login: vi.fn(() => of({ token: 't' })),
      register: vi.fn((_req: RegisterRequest) => of({ message: 'Registro exitoso' })),
      forgotPassword: vi.fn(() => of({ message: 'Te enviamos un email' })),
      resendVerification: vi.fn(() => of({ message: 'Reenviado' }))
    }),
    notification: { showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() }
  };
}

async function renderLogin(mocks: ReturnType<typeof makeMocks>) {
  return render(LoginComponent, {
    providers: [
      { provide: Router, useValue: mocks.router },
      { provide: AuthService, useValue: mocks.auth },
      { provide: NotificationService, useValue: mocks.notification }
    ]
  });
}

describe('LoginComponent', () => {
  it('si ya hay sesión iniciada, redirige a /turnos desde el constructor (no en ngOnInit)', async () => {
    const mocks = makeMocks({ isAuthenticated: true });
    await renderLogin(mocks);

    expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/turnos');
  });

  it('sin sesión, no redirige', async () => {
    const mocks = makeMocks({ isAuthenticated: false });
    await renderLogin(mocks);

    expect(mocks.router.navigateByUrl).not.toHaveBeenCalled();
  });

  describe('onLogin', () => {
    it('con campos vacíos, marca error y no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);

      fixture.componentInstance.onLogin();

      expect(fixture.componentInstance.errorMessage).toBe('Complete todos los campos');
      expect(mocks.auth.login).not.toHaveBeenCalled();
    });

    it('si ya está loading, no hace nada (guard de doble submit)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.loginData = { username: 'ana', password: '123456' };
      fixture.componentInstance.loading = true;

      fixture.componentInstance.onLogin();

      expect(mocks.auth.login).not.toHaveBeenCalled();
    });

    it('éxito: navega a /turnos', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.loginData = { username: 'ana', password: '123456' };

      fixture.componentInstance.onLogin();

      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/turnos');
    });

    it('error con mensaje que menciona "verificar" (case-insensitive): activa emailNotVerified y NO dispara toast', async () => {
      const mocks = makeMocks();
      mocks.auth.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Debés Verificar tu email antes de iniciar sesión' } }))
      );
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.loginData = { username: 'ana', password: '123456' };

      fixture.componentInstance.onLogin();

      expect(fixture.componentInstance.emailNotVerified).toBe(true);
      expect(mocks.notification.showError).not.toHaveBeenCalled();
      expect(fixture.componentInstance.loading).toBe(false);
    });

    it('error sin "verificar" en el mensaje: no activa emailNotVerified y sí dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.auth.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'Usuario o contraseña incorrectos' } }))
      );
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.loginData = { username: 'ana', password: 'mala' };

      fixture.componentInstance.onLogin();

      expect(fixture.componentInstance.emailNotVerified).toBe(false);
      expect(mocks.notification.showError).toHaveBeenCalledWith('Usuario o contraseña incorrectos');
    });

    it('error de red (status 0): usa el mensaje de "no se pudo conectar"', async () => {
      const mocks = makeMocks();
      mocks.auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.loginData = { username: 'ana', password: '123456' };

      fixture.componentInstance.onLogin();

      expect(fixture.componentInstance.errorMessage).toBe('No se pudo conectar con el servidor. Verifique su conexión.');
    });
  });

  describe('onRegister: matriz de validación cliente', () => {
    function baseValidData(fixture: { componentInstance: LoginComponent }) {
      fixture.componentInstance.registerData = {
        username: 'anagarcia',
        email: 'ana@test.com',
        password: '123456',
        nombre: 'Ana',
        apellido: 'García',
        identificacion: '',
        telefono: ''
      };
      fixture.componentInstance.confirmPassword = '123456';
      fixture.componentInstance.selectedOrgMode = 'new';
      fixture.componentInstance.organizacionNombre = 'Clínica X';
      fixture.componentInstance.pais = 'AR';
    }

    it('con todo válido, no hay fieldErrors y se llama a authService.register', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.fieldErrors).toEqual({});
      expect(mocks.auth.register).toHaveBeenCalled();
    });

    it('username vacío o muy corto', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);
      fixture.componentInstance.registerData.username = 'ab';

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.fieldErrors['username']).toBe('El usuario debe tener al menos 3 caracteres');
    });

    it('email inválido', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);
      fixture.componentInstance.registerData.email = 'no-es-un-email';

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.fieldErrors['email']).toBe('Ingrese un email válido');
    });

    it('password corta y confirmación que no coincide', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);
      fixture.componentInstance.registerData.password = '123';
      fixture.componentInstance.confirmPassword = '456';

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.fieldErrors['password']).toBe('Mínimo 6 caracteres');
      expect(fixture.componentInstance.fieldErrors['confirmPassword']).toBe('Las contraseñas no coinciden');
    });

    it('nombre con números: rechazado por el pattern de nombre de persona', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);
      fixture.componentInstance.registerData.nombre = 'Ana123';

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.fieldErrors['nombre']).toBe('Solo puede contener letras y espacios');
    });

    it('identificación y teléfono son opcionales, pero si vienen deben cumplir el formato', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);
      fixture.componentInstance.registerData.identificacion = '#!';
      fixture.componentInstance.registerData.telefono = 'abc';

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.fieldErrors['identificacion']).toBe('Debe tener entre 5 y 20 caracteres alfanuméricos');
      expect(fixture.componentInstance.fieldErrors['telefono']).toBe('Formato de teléfono inválido');
    });

    it('con errores de campo, no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);
      fixture.componentInstance.registerData.email = 'invalido';

      fixture.componentInstance.onRegister();

      expect(mocks.auth.register).not.toHaveBeenCalled();
      expect(fixture.componentInstance.errorMessage).toBe('Corrija los errores marcados');
    });

    it('selectedOrgMode "new": manda organizacionNombre/pais y borra invitationToken', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);

      fixture.componentInstance.onRegister();

      const sentDto = mocks.auth.register.mock.calls[0][0];
      expect(sentDto.organizacionNombre).toBe('Clínica X');
      expect(sentDto.pais).toBe('AR');
      expect(sentDto.invitationToken).toBeUndefined();
    });

    it('selectedOrgMode "join": manda invitationToken y borra organizacionNombre/pais', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);
      fixture.componentInstance.selectedOrgMode = 'join';
      fixture.componentInstance.invitationCode = 'ABC123';

      fixture.componentInstance.onRegister();

      const sentDto = mocks.auth.register.mock.calls[0][0];
      expect(sentDto.invitationToken).toBe('ABC123');
      expect(sentDto.organizacionNombre).toBeUndefined();
      expect(sentDto.pais).toBeUndefined();
    });

    it('éxito: registerSuccess=true con el mensaje del backend', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.registerSuccess).toBe(true);
      expect(fixture.componentInstance.registerSuccessMessage).toBe('Registro exitoso');
    });

    it('error: dispara el toast y no marca registerSuccess', async () => {
      const mocks = makeMocks();
      mocks.auth.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'El usuario ya existe' } })));
      const { fixture } = await renderLogin(mocks);
      baseValidData(fixture);

      fixture.componentInstance.onRegister();

      expect(fixture.componentInstance.registerSuccess).toBe(false);
      expect(mocks.notification.showError).toHaveBeenCalledWith('El usuario ya existe');
    });
  });

  describe('nextStep/prevStep del wizard de registro', () => {
    it('modo "new" exige organización y país antes de avanzar', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.selectedOrgMode = 'new';

      fixture.componentInstance.nextStep();
      expect(fixture.componentInstance.registerStep).toBe('org');
      expect(fixture.componentInstance.errorMessage).toContain('organización');

      fixture.componentInstance.organizacionNombre = 'Clínica X';
      fixture.componentInstance.nextStep();
      expect(fixture.componentInstance.errorMessage).toContain('país');

      fixture.componentInstance.pais = 'AR';
      fixture.componentInstance.nextStep();
      expect(fixture.componentInstance.registerStep).toBe('account');
    });

    it('modo "join" exige código de invitación', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.selectedOrgMode = 'join';

      fixture.componentInstance.nextStep();
      expect(fixture.componentInstance.registerStep).toBe('org');

      fixture.componentInstance.invitationCode = 'ABC123';
      fixture.componentInstance.nextStep();
      expect(fixture.componentInstance.registerStep).toBe('account');
    });

    it('prevStep vuelve de "account" a "org"', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.registerStep = 'account';

      fixture.componentInstance.prevStep();

      expect(fixture.componentInstance.registerStep).toBe('org');
    });
  });

  it('toggleMode resetea todo el estado de registro/forgot/resend', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderLogin(mocks);
    fixture.componentInstance.registerStep = 'account';
    fixture.componentInstance.organizacionNombre = 'algo';
    fixture.componentInstance.forgotPasswordMode = true;
    fixture.componentInstance.emailNotVerified = true;

    fixture.componentInstance.toggleMode();

    expect(fixture.componentInstance.isLoginMode).toBe(false);
    expect(fixture.componentInstance.registerStep).toBe('org');
    expect(fixture.componentInstance.organizacionNombre).toBe('');
    expect(fixture.componentInstance.forgotPasswordMode).toBe(false);
    expect(fixture.componentInstance.emailNotVerified).toBe(false);
  });

  describe('showResendVerification', () => {
    it('si el username de login es un email, lo precarga; si no, deja vacío', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);

      fixture.componentInstance.loginData.username = 'ana@test.com';
      fixture.componentInstance.showResendVerification();
      expect(fixture.componentInstance.resendVerificationEmail).toBe('ana@test.com');

      fixture.componentInstance.loginData.username = 'ana';
      fixture.componentInstance.showResendVerification();
      expect(fixture.componentInstance.resendVerificationEmail).toBe('');
    });
  });

  describe('onForgotPassword / onResendVerification', () => {
    it('onForgotPassword con email inválido no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.forgotPasswordEmail = 'no-es-email';

      fixture.componentInstance.onForgotPassword();

      expect(mocks.auth.forgotPassword).not.toHaveBeenCalled();
      expect(fixture.componentInstance.errorMessage).toBe('Ingresá un email válido');
    });

    it('onForgotPassword éxito marca forgotPasswordSuccess con el mensaje del backend', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.forgotPasswordEmail = 'ana@test.com';

      fixture.componentInstance.onForgotPassword();

      expect(fixture.componentInstance.forgotPasswordSuccess).toBe(true);
      expect(fixture.componentInstance.forgotPasswordMessage).toBe('Te enviamos un email');
    });

    it('onResendVerification éxito marca resendVerificationSuccess', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderLogin(mocks);
      fixture.componentInstance.resendVerificationEmail = 'ana@test.com';

      fixture.componentInstance.onResendVerification();

      expect(fixture.componentInstance.resendVerificationSuccess).toBe(true);
      expect(fixture.componentInstance.resendVerificationMessage).toBe('Reenviado');
    });
  });
});
