import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_CONFIG } from '../services/api.config';

const AUTH_URL_PREFIX = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}`;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && !req.url.startsWith(AUTH_URL_PREFIX)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};
