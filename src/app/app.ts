import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { SuscripcionBannerComponent } from './shared/components/suscripcion-banner/suscripcion-banner.component';
import { filter } from 'rxjs';

/** Rutas públicas, alcanzables sin sesión — el navbar no debe renderizarse ahí: dispara un fetch
 *  de `/modules/rules` que sin token da 401, y el interceptor global fuerza un redirect a /login
 *  antes de que la página pública llegue a mostrarse (AUTH-067 lo detectó en reset-password). */
const PUBLIC_ROUTES = ['/login', '/reset-password', '/verify-email'];

function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some(route => url.includes(route));
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SuscripcionBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Arrancar en `true` y recién corregir en el primer NavigationEnd deja una ventana — en un
  // deep-link directo a una ruta pública (ej. abrir /reset-password desde el mail) el navbar
  // llega a montarse y dispara su fetch ANTES de que el router resuelva la navegación inicial.
  // Se deriva del URL actual desde el arranque para que ese primer render ya sea correcto.
  showNavbar = !isPublicRoute(window.location.pathname);

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.showNavbar = !isPublicRoute(event.urlAfterRedirects);
    });
  }
}
