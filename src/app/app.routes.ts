import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    redirectTo: 'turnos',
    pathMatch: 'full'
  },
  {
    path: 'turnos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/appointments/pages/turnos-view/turnos-view.component').then(
        m => m.TurnosViewComponent
      )
  },
  {
    path: 'odontograma',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/odontograma/components/odontograma-view/odontograma-view.component').then(
        m => m.OdontogramaViewComponent
      )
  },
  {
    path: 'seguimiento',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/seguimiento/seguimiento-view/seguimiento-view.component').then(
        m => m.SeguimientoViewComponent
      )
  },
  {
    path: 'configuraciones',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/configuraciones/configuraciones-view/configuraciones-view.component').then(
        m => m.ConfiguracionesViewComponent
      )
  },
  {
    path: '**',
    redirectTo: 'turnos'
  }
];
