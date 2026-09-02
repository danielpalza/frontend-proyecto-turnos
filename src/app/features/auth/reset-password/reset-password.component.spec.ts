import { render, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/services/auth.service';
import { createAuthServiceMock } from '../../../../testing/auth-service.mock';

function routeWithToken(token: string | null) {
  return {
    snapshot: { queryParamMap: { get: (key: string) => (key === 'token' ? token : null) } }
  };
}

async function renderReset(token: string | null, authOverrides: Record<string, unknown> = {}) {
  const auth = createAuthServiceMock(authOverrides);
  const router = { navigate: vi.fn() };
  const result = await render(ResetPasswordComponent, {
    providers: [
      { provide: Router, useValue: router },
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: routeWithToken(token) }
    ]
  });
  return { ...result, auth, router };
}

describe('ResetPasswordComponent', () => {
  it('éxito: saca el spinner y muestra el resultado (zoneless: detectChanges en el subscribe)', async () => {
    const { fixture } = await renderReset('token-ok', {
      resetPassword: vi.fn(() => of({ message: 'Contraseña actualizada correctamente. Ya podés iniciar sesión.' }))
    });
    fixture.componentInstance.newPassword = '123456';
    fixture.componentInstance.confirmPassword = '123456';

    fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.success).toBe(true);
    expect(screen.getByText('Contraseña actualizada')).toBeTruthy();
    expect(screen.getByText('Contraseña actualizada correctamente. Ya podés iniciar sesión.')).toBeTruthy();
  });

  it('error: saca el spinner y muestra el mensaje del backend', async () => {
    const { fixture } = await renderReset('token-malo', {
      resetPassword: vi.fn(() =>
        throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'Token de recuperación inválido o expirado' } }))
      )
    });
    fixture.componentInstance.newPassword = '123456';
    fixture.componentInstance.confirmPassword = '123456';

    fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.success).toBe(false);
    expect(screen.getByText('Token de recuperación inválido o expirado')).toBeTruthy();
  });
});
