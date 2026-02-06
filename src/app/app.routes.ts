import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'turnos',
    pathMatch: 'full'
  },
  {
    path: 'turnos',
    loadComponent: () =>
      import('./features/appointments/pages/turnos-view/turnos-view.component').then(
        m => m.TurnosViewComponent
      )
  },
  {
    path: 'odontograma',
    loadComponent: () =>
      import('./features/odontograma/components/odontograma-view/odontograma-view.component').then(
        m => m.OdontogramaViewComponent
      )
  },
  {
    path: 'seguimiento',
    loadComponent: () =>
      import('./features/seguimiento/seguimiento-view/seguimiento-view.component').then(
        m => m.SeguimientoViewComponent
      )
  },
  {
    path: 'configuraciones',
    loadComponent: () =>
      import('./features/configuraciones/configuraciones-view/configuraciones-view.component').then(
        m => m.ConfiguracionesViewComponent
      )
  }
];
