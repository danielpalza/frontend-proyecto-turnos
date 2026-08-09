import { Capability } from './capabilities';
import { AuthService } from '../services/auth.service';

/**
 * Ruta destino de cada pestaña, en el orden en que aparecen en el navbar, con la capacidad que la
 * habilita. `ODONTOGRAMA` no figura: no tiene una ruta fija, siempre se entra desde un turno.
 */
const LANDING_ROUTES: { route: string; capability: string }[] = [
  { route: '/panel', capability: Capability.PANEL_VIEW },
  { route: '/turnos', capability: Capability.TURNOS_VIEW },
  { route: '/seguimiento', capability: Capability.SEGUIMIENTO_VIEW },
  { route: '/coberturas', capability: Capability.COBERTURA_VIEW },
  { route: '/configuraciones', capability: Capability.CONFIGURACIONES_VIEW }
];

/**
 * Primera pestaña que el usuario puede ver.
 *
 * Antes se redirigía siempre a `/panel`, y quien no tenía ese módulo terminaba en `/login`, que se
 * lee como sesión vencida. Ver `docs/PERMISOS.md § 6.5`.
 */
export function resolveHomeRoute(hasCapability: (capability: string) => boolean): string {
  return LANDING_ROUTES.find(entry => hasCapability(entry.capability))?.route ?? '/403';
}

/**
 * Igual que {@link resolveHomeRoute}, pero mirando primero el rol `ADMIN`: el dueño del SaaS
 * siempre aterriza en el panel superadmin, tenga o no capacidades de alguna organización real
 * (podría ser dueño de una clínica de prueba). Única función que debe usarse para decidir a dónde
 * mandar a un usuario autenticado — tanto el guard (`homeRedirect`) como la pantalla 403
 * (`ForbiddenComponent`) pasan por acá para no duplicar el orden de prioridad.
 */
export function resolveHomeRouteForUser(authService: AuthService): string {
  if (authService.hasRole('ADMIN')) {
    return '/admin';
  }
  return resolveHomeRoute(c => authService.hasCapability(c));
}
