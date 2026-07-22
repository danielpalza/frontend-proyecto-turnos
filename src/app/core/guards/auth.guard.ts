import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { resolveHomeRoute } from '../auth/home-route';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const requiredCapability = route.data?.['capability'] as string | undefined;
  if (requiredCapability && !authService.hasCapability(requiredCapability)) {
    router.navigate(['/403']);
    return false;
  }

  return true;
};

/** Destino de `/` y de cualquier ruta desconocida: la primera pestaña que el usuario puede ver. */
export const homeRedirect = (): string => {
  const authService = inject(AuthService);
  if (!authService.isAuthenticated()) {
    return '/login';
  }
  return resolveHomeRoute(c => authService.hasCapability(c));
};
