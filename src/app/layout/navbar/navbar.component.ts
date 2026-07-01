import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OdontogramaStateService } from '../../features/odontograma/services/odontograma-state.service';
import { NotificationService } from '../../core/services/notification.service';

export type ViewType = 'panel' | 'turnos' | 'odontograma' | 'seguimiento' | 'configuraciones';

interface NavItem {
  title: string;
  icon: string;
  route?: string;
  /** Código de Module (backend) que habilita esta pestaña. */
  moduleCode: string;
  /** Requiere un turno cargado; no navega a una ruta fija. */
  requiresAppointment?: boolean;
}



@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})

export class NavbarComponent {

  constructor(
    private router: Router,
    private authService: AuthService,
    private odontogramaState: OdontogramaStateService,
    private notification: NotificationService
  ) {}



  private readonly allMenuItems: NavItem[] = [
    { title: 'Panel', icon: 'bi-speedometer2', route: '/panel', moduleCode: 'PANEL' },
    { title: 'Turnos', icon: 'bi-calendar', route: '/turnos', moduleCode: 'TURNOS' },
    { title: 'Odontograma', icon: 'bi-heart-pulse', requiresAppointment: true, moduleCode: 'ODONTOGRAMA' },
    { title: 'Seguimiento', icon: 'bi-clipboard-data', route: '/seguimiento', moduleCode: 'SEGUIMIENTO' },
    { title: 'Configuraciones', icon: 'bi-gear', route: '/configuraciones', moduleCode: 'CONFIGURACIONES' }
  ];

  get menuItems(): NavItem[] {
    return this.allMenuItems.filter(item => this.authService.hasModule(item.moduleCode));
  }

  get organizationNombre(): string | null {
    return this.authService.getCurrentUser()?.organizationNombre ?? null;
  }

  isOdontogramaActive(): boolean {
    return this.router.url.startsWith('/odontograma/');
  }



  onNavClick(item: NavItem, event: Event): void {
    if (!item.requiresAppointment) {
      return;
    }

    event.preventDefault();

    const appointmentId = this.odontogramaState.appointmentIdValue;

    if (appointmentId) {
      this.router.navigate(['/odontograma', appointmentId]);
      return;
    }


    this.notification.showInfo(
      'Seleccioná un turno y usá el botón de corazón para abrir el odontograma.'
    );

    this.router.navigate(['/turnos']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}


