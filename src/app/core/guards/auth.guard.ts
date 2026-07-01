import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const requiredModule = route.data?.['module'] as string | undefined;
  if (requiredModule && !authService.hasModule(requiredModule)) {
    router.navigate([requiredModule === 'PANEL' ? '/login' : '/panel']);
    return false;
  }

  return true;
};
