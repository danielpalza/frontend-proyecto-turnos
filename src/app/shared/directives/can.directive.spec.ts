import { render, screen } from '@testing-library/angular';
import { Subject } from 'rxjs';
import { CanDirective, CanShowDirective } from './can.directive';
import { AuthService } from '../../core/services/auth.service';
import { capabilityDeniedMessage } from '../../core/auth/capabilities';

function mockAuth(initialAllowed: boolean) {
  return {
    currentUser$: new Subject<unknown>(),
    hasCapability: vi.fn(() => initialAllowed)
  };
}

describe('CanDirective', () => {
  it('sin la capacidad: agrega capability-locked, aria-disabled, disabled y title en un <button>', async () => {
    const auth = mockAuth(false);
    await render('<button [appCan]="cap">X</button>', {
      imports: [CanDirective],
      componentProperties: { cap: 'TURNOS:MANAGE' },
      providers: [{ provide: AuthService, useValue: auth }]
    });

    const button = screen.getByText('X');
    expect(button).toHaveClass('capability-locked');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('disabled');
    expect(button).toHaveAttribute('title', capabilityDeniedMessage('TURNOS:MANAGE'));
  });

  it('con la capacidad: sin clase, sin aria-disabled, sin disabled', async () => {
    const auth = mockAuth(true);
    await render('<button [appCan]="cap">X</button>', {
      imports: [CanDirective],
      componentProperties: { cap: 'TURNOS:MANAGE' },
      providers: [{ provide: AuthService, useValue: auth }]
    });

    const button = screen.getByText('X');
    expect(button).not.toHaveClass('capability-locked');
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(button).not.toHaveAttribute('disabled');
  });

  it('sin la capacidad sobre un <a> (no disableable): clase + aria-disabled, sin atributo disabled', async () => {
    const auth = mockAuth(false);
    await render('<a [appCan]="cap">Link</a>', {
      imports: [CanDirective],
      componentProperties: { cap: 'TURNOS:MANAGE' },
      providers: [{ provide: AuthService, useValue: auth }]
    });

    const link = screen.getByText('Link');
    expect(link).toHaveClass('capability-locked');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('disabled');
  });

  it('reacciona a un cambio de sesión sin recrear el host', async () => {
    const auth = mockAuth(false);
    await render('<button [appCan]="cap">X</button>', {
      imports: [CanDirective],
      componentProperties: { cap: 'TURNOS:MANAGE' },
      providers: [{ provide: AuthService, useValue: auth }]
    });

    expect(screen.getByText('X')).toHaveClass('capability-locked');

    auth.hasCapability.mockReturnValue(true);
    auth.currentUser$.next({});

    expect(screen.getByText('X')).not.toHaveClass('capability-locked');
  });
});

describe('CanShowDirective', () => {
  it('con la capacidad: el elemento existe', async () => {
    const auth = mockAuth(true);
    await render('<a *appCanShow="cap">Link</a>', {
      imports: [CanShowDirective],
      componentProperties: { cap: 'COBERTURA:VIEW' },
      providers: [{ provide: AuthService, useValue: auth }]
    });

    expect(screen.getByText('Link')).toBeVisible();
  });

  it('sin la capacidad: el elemento no se crea', async () => {
    const auth = mockAuth(false);
    await render('<a *appCanShow="cap">Link</a>', {
      imports: [CanShowDirective],
      componentProperties: { cap: 'COBERTURA:VIEW' },
      providers: [{ provide: AuthService, useValue: auth }]
    });

    expect(screen.queryByText('Link')).toBeNull();
  });

  it('toggle false→true vía currentUser$: el elemento aparece', async () => {
    const auth = mockAuth(false);
    await render('<a *appCanShow="cap">Link</a>', {
      imports: [CanShowDirective],
      componentProperties: { cap: 'COBERTURA:VIEW' },
      providers: [{ provide: AuthService, useValue: auth }]
    });

    expect(screen.queryByText('Link')).toBeNull();

    auth.hasCapability.mockReturnValue(true);
    auth.currentUser$.next({});

    expect(screen.getByText('Link')).toBeVisible();
  });
});
