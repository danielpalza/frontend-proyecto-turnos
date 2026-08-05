import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClinicalAttentionService } from '../../core/services/clinical-attention.service';
import { NotificationService } from '../../core/services/notification.service';
import { ModuleRulesService } from '../../core/services/module-rules.service';
import { ClinicalModuleRule } from '../../core/models/module-rules.model';
import { Capability } from '../../core/auth/capabilities';

export type ViewType = 'panel' | 'turnos' | 'seguimiento' | 'configuraciones';

interface NavItem {
  title: string;
  icon: string;
  route?: string;
  /** Capacidad que habilita esta pestaña. Ver `docs/PERMISOS.md`. */
  capability: string;
  /** Requiere un turno cargado; no navega a una ruta fija. */
  requiresAppointment?: boolean;
}

const STATIC_MENU_ITEMS: NavItem[] = [
  { title: 'Panel', icon: 'bi-speedometer2', route: '/panel', capability: Capability.PANEL_VIEW },
  { title: 'Turnos', icon: 'bi-calendar', route: '/turnos', capability: Capability.TURNOS_VIEW },
  { title: 'Seguimiento', icon: 'bi-clipboard-data', route: '/seguimiento', capability: Capability.SEGUIMIENTO_VIEW },
  { title: 'Cobertura', icon: 'bi-shield-check', route: '/coberturas', capability: Capability.COBERTURA_VIEW },
  { title: 'Configuraciones', icon: 'bi-gear', route: '/configuraciones', capability: Capability.CONFIGURACIONES_VIEW }
];

const ATENCION_ITEM: NavItem = {
  title: 'Atención',
  icon: 'bi-person-badge',
  requiresAppointment: true,
  capability: '' // se resuelve aparte: "cualquiera de" los módulos clínicos, no una sola capacidad fija
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  /**
   * Módulos clínicos disponibles (Odontograma, Historia Clínica, y los que se agreguen a futuro).
   * La pestaña "Atención" es una sola para todos: una sesión solo puede estar atendiendo un turno a
   * la vez, sin importar el módulo, así que no tiene sentido una pestaña por módulo.
   */
  private clinicalModules: ClinicalModuleRule[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private clinicalAttention: ClinicalAttentionService,
    private notification: NotificationService,
    private moduleRulesService: ModuleRulesService
  ) {}

  ngOnInit(): void {
    this.moduleRulesService.getClinicalModules().subscribe({
      next: modules => (this.clinicalModules = modules),
      error: err => console.error('No se pudieron cargar los módulos clínicos:', err)
    });
  }

  private hasAnyClinicalCapability(): boolean {
    return this.clinicalModules.some(m => this.authService.hasCapability(`${m.codigo}:VIEW`));
  }

  get menuItems(): NavItem[] {
    const items: NavItem[] = [];
    const push = (item: NavItem, allowed: boolean) => { if (allowed) items.push(item); };

    push(STATIC_MENU_ITEMS[0], this.authService.hasCapability(Capability.PANEL_VIEW)); // Panel
    push(STATIC_MENU_ITEMS[1], this.authService.hasCapability(Capability.TURNOS_VIEW)); // Turnos
    push(ATENCION_ITEM, this.hasAnyClinicalCapability());
    push(STATIC_MENU_ITEMS[2], this.authService.hasCapability(Capability.SEGUIMIENTO_VIEW)); // Seguimiento
    push(STATIC_MENU_ITEMS[3], this.authService.hasCapability(Capability.COBERTURA_VIEW)); // Cobertura
    push(STATIC_MENU_ITEMS[4], this.authService.hasCapability(Capability.CONFIGURACIONES_VIEW)); // Configuraciones

    return items;
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

  isAtencionActive(): boolean {
    return this.clinicalModules.some(m => this.router.url.startsWith(`/${m.rutaClinica}/`));
  }

  navItemTestId(item: NavItem): string {
    return item.route ? item.route.slice(1) : (item.requiresAppointment ? 'atencion' : 'clinico');
  }

  onNavClick(item: NavItem, event: Event): void {
    if (!item.requiresAppointment) {
      return;
    }

    event.preventDefault();

    const last = this.clinicalAttention.getLast();

    if (last) {
      this.router.navigate([`/${last.rutaClinica}`, last.appointmentId]);
      return;
    }

    this.notification.showInfo(
      'Seleccioná un turno y usá el botón de corazón para iniciar la atención.'
    );

    this.router.navigate(['/turnos']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}
