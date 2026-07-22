import { Capability } from './capabilities';

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
