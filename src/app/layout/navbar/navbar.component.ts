import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OdontogramaStateService } from '../../features/odontograma/services/odontograma-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { Capability } from '../../core/auth/capabilities';

export type ViewType = 'panel' | 'turnos' | 'odontograma' | 'seguimiento' | 'configuraciones';

interface NavItem {
  title: string;
  icon: string;
  route?: string;
  /** Capacidad que habilita esta pestaña. Ver `docs/PERMISOS.md`. */
  capability: string;
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
    { title: 'Panel', icon: 'bi-speedometer2', route: '/panel', capability: Capability.PANEL_VIEW },
    { title: 'Turnos', icon: 'bi-calendar', route: '/turnos', capability: Capability.TURNOS_VIEW },
    { title: 'Odontograma', icon: 'bi-heart-pulse', requiresAppointment: true, capability: Capability.ODONTOGRAMA_VIEW },
    { title: 'Seguimiento', icon: 'bi-clipboard-data', route: '/seguimiento', capability: Capability.SEGUIMIENTO_VIEW },
    { title: 'Cobertura', icon: 'bi-shield-check', route: '/coberturas', capability: Capability.COBERTURA_VIEW },
    { title: 'Configuraciones', icon: 'bi-gear', route: '/configuraciones', capability: Capability.CONFIGURACIONES_VIEW }
  ];

  get menuItems(): NavItem[] {
    return this.allMenuItems.filter(item => this.authService.hasCapability(item.capability));
  }

  get organizationNombre(): string | null {
    return this.authService.getCurrentUser()?.organizationNombre ?? null;
  }

  get userFullName(): string | null {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return null;
    }
    return [user.nombre, user.apellido].filter(Boolean).join(' ') || null;
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


