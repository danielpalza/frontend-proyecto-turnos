import { Routes } from '@angular/router';
import { authGuard, homeRedirect } from './core/guards/auth.guard';
import { Capability } from './core/auth/capabilities';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: '403',
    loadComponent: () =>
      import('./features/errors/forbidden/forbidden.component').then(m => m.ForbiddenComponent)
  },
  {
    path: '',
    redirectTo: homeRedirect,
    pathMatch: 'full'
  },
  {
    path: 'panel',
    canActivate: [authGuard],
    data: { capability: Capability.PANEL_VIEW },
    loadComponent: () =>
      import('./features/panel/panel-view/panel-view.component').then(m => m.PanelViewComponent)
  },
  {
    path: 'turnos',
    canActivate: [authGuard],
    data: { capability: Capability.TURNOS_VIEW },
    loadComponent: () =>
      import('./features/appointments/pages/turnos-view/turnos-view.component').then(
        m => m.TurnosViewComponent
      )
  },
  {
    path: 'odontograma/:appointmentId',
    canActivate: [authGuard],
    data: { capability: Capability.ODONTOGRAMA_VIEW },
    loadComponent: () =>
      import('./features/odontograma/components/odontograma-view/odontograma-view.component').then(
        m => m.OdontogramaViewComponent
      )
  },
  {
    path: 'odontograma',
    redirectTo: 'turnos',
    pathMatch: 'full'
  },
  {
    path: 'seguimiento',
    canActivate: [authGuard],
    data: { capability: Capability.SEGUIMIENTO_VIEW },
    loadComponent: () =>
      import('./features/seguimiento/seguimiento-view/seguimiento-view.component').then(
        m => m.SeguimientoViewComponent
      )
  },
  {
    path: 'configuraciones',
    canActivate: [authGuard],
    data: { capability: Capability.CONFIGURACIONES_VIEW },
    loadComponent: () =>
      import('./features/configuraciones/configuraciones-view/configuraciones-view.component').then(
        m => m.ConfiguracionesViewComponent
      )
  },
  {
    path: 'coberturas',
    canActivate: [authGuard],
    data: { capability: Capability.COBERTURA_VIEW },
    loadComponent: () =>
      import('./features/coberturas/coberturas-view/coberturas-view.component').then(
        m => m.CoberturasViewComponent
      )
  },
  {
    path: '**',
    redirectTo: homeRedirect
  }
];
