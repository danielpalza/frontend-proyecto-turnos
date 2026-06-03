import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OdontogramaStateService } from '../../features/odontograma/services/odontograma-state.service';
import { NotificationService } from '../../core/services/notification.service';

export type ViewType = 'turnos' | 'odontograma' | 'seguimiento' | 'configuraciones';

interface NavItem {
  title: string;
  icon: string;
  route?: string;
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



  menuItems: NavItem[] = [
    { title: 'Turnos', icon: 'bi-calendar', route: '/turnos' },
    { title: 'Odontograma', icon: 'bi-heart-pulse', requiresAppointment: true },
    { title: 'Seguimiento', icon: 'bi-clipboard-data', route: '/seguimiento' },
    { title: 'Configuraciones', icon: 'bi-gear', route: '/configuraciones' }
  ];



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
      'Seleccioná un turno en la pantalla Turnos y usá el botón corazón para abrir el odontograma.'
    );

    this.router.navigate(['/turnos']);
  }



  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}


