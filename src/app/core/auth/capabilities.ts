/**
 * Espejo de la tabla de reglas del backend (`CapabilityCatalog.java`).
 *
 * La fuente de verdad es el backend: `AuthResponse.capabilities` viene ya resuelto y es lo que
 * consulta la app. Esta copia existe para dos usos acotados:
 *  1. Previsualizar en el modal de profesional qué módulos arrastra cada tilde.
 *  2. Derivar capacidades de sesiones viejas cacheadas en `localStorage` que solo tienen `modules`.
 *
 * Ver `bakend-proyecto-turnos/docs/PERMISOS.md`.
 */

import { MODULE_OPTIONS } from '../models/profesional.model';

export type ModuleCode =
  | 'PANEL'
  | 'TURNOS'
  | 'ODONTOGRAMA'
  | 'SEGUIMIENTO'
  | 'COBERTURA'
  | 'CONFIGURACIONES';

export const Capability = {
  PANEL_VIEW: 'PANEL:VIEW',

  TURNOS_VIEW: 'TURNOS:VIEW',
  TURNOS_MANAGE: 'TURNOS:MANAGE',
  TURNOS_COBRAR: 'TURNOS:COBRAR',
  TURNOS_NOTIFY: 'TURNOS:NOTIFY',

  ODONTOGRAMA_VIEW: 'ODONTOGRAMA:VIEW',
  ODONTOGRAMA_EDIT: 'ODONTOGRAMA:EDIT',

  SEGUIMIENTO_VIEW: 'SEGUIMIENTO:VIEW',
  SEGUIMIENTO_PACIENTES: 'SEGUIMIENTO:PACIENTES',
  SEGUIMIENTO_COBRAR: 'SEGUIMIENTO:COBRAR',

  COBERTURA_VIEW: 'COBERTURA:VIEW',
  COBERTURA_MANAGE: 'COBERTURA:MANAGE',

  CONFIGURACIONES_VIEW: 'CONFIGURACIONES:VIEW',
  CONFIGURACIONES_WHATSAPP: 'CONFIGURACIONES:WHATSAPP',
  CONFIGURACIONES_PLAN: 'CONFIGURACIONES:PLAN',

  PROFESIONALES_VIEW: 'PROFESIONALES:VIEW',
  PROFESIONALES_MANAGE: 'PROFESIONALES:MANAGE',
  /** Solo por rol OWNER — no la concede ningún módulo. */
  PROFESIONALES_DELETE: 'PROFESIONALES:DELETE',

  ACCESOS_MANAGE: 'ACCESOS:MANAGE',
  INVITACIONES_MANAGE: 'INVITACIONES:MANAGE'
} as const;

export type Capability = (typeof Capability)[keyof typeof Capability];

/** Capacidades propias de cada módulo. */
export const MODULE_CAPABILITIES: Record<ModuleCode, readonly Capability[]> = {
  PANEL: [Capability.PANEL_VIEW],
  TURNOS: [
    Capability.TURNOS_VIEW,
    Capability.TURNOS_MANAGE,
    Capability.TURNOS_COBRAR,
    Capability.TURNOS_NOTIFY
  ],
  ODONTOGRAMA: [Capability.ODONTOGRAMA_VIEW, Capability.ODONTOGRAMA_EDIT],
  SEGUIMIENTO: [
    Capability.SEGUIMIENTO_VIEW,
    Capability.SEGUIMIENTO_PACIENTES,
    Capability.SEGUIMIENTO_COBRAR
  ],
  COBERTURA: [Capability.COBERTURA_VIEW, Capability.COBERTURA_MANAGE],
  CONFIGURACIONES: [
    Capability.CONFIGURACIONES_VIEW,
    Capability.CONFIGURACIONES_WHATSAPP,
    Capability.CONFIGURACIONES_PLAN,
    Capability.PROFESIONALES_VIEW,
    Capability.PROFESIONALES_MANAGE,
    Capability.ACCESOS_MANAGE,
    Capability.INVITACIONES_MANAGE
  ]
};

/**
 * Capacidades extra que arrastra tener concedido un módulo.
 *
 * Disparan desde **módulos concedidos**, nunca desde capacidades ya derivadas: la resolución es de
 * un solo paso, sin clausura transitiva. Por eso tener solo `ODONTOGRAMA` da `TURNOS:VIEW` pero no
 * arrastra `SEGUIMIENTO`, que cuelga del módulo `TURNOS` concedido.
 */
export const MODULE_IMPLICATIONS: Partial<Record<ModuleCode, readonly Capability[]>> = {
  // Regla A (parcial): entra a la pestaña Turnos para poder iniciar un turno.
  ODONTOGRAMA: [Capability.TURNOS_VIEW],
  // Regla B (total): la turnera habilita Seguimiento completo.
  TURNOS: MODULE_CAPABILITIES.SEGUIMIENTO
};

/** Presets del modal de profesional. Tildan módulos, no capacidades. */
export const MODULE_PRESETS: { id: string; label: string; modules: readonly ModuleCode[] }[] = [
  { id: 'PROFESIONAL', label: 'Profesional', modules: ['ODONTOGRAMA'] },
  { id: 'RECEPCION', label: 'Recepción', modules: ['TURNOS', 'COBERTURA'] },
  { id: 'ADMINISTRACION', label: 'Administración', modules: ['PANEL', 'TURNOS', 'CONFIGURACIONES'] },
  {
    id: 'TODOS',
    label: 'Todos',
    modules: ['PANEL', 'TURNOS', 'ODONTOGRAMA', 'SEGUIMIENTO', 'COBERTURA', 'CONFIGURACIONES']
  }
];

export function resolveCapabilities(granted: readonly string[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const code of granted) {
    MODULE_CAPABILITIES[code as ModuleCode]?.forEach(c => out.add(c));
    MODULE_IMPLICATIONS[code as ModuleCode]?.forEach(c => out.add(c));
  }
  return out;
}

/** Módulos que un tilde arrastra, para previsualizar en el modal. */
export function derivedModules(granted: readonly string[]): Set<ModuleCode> {
  const capabilities = resolveCapabilities(granted);
  const derived = new Set<ModuleCode>();

  for (const code of Object.keys(MODULE_CAPABILITIES) as ModuleCode[]) {
    if (granted.includes(code)) continue;
    if (MODULE_CAPABILITIES[code].some(c => capabilities.has(c))) {
      derived.add(code);
    }
  }
  return derived;
}

const MODULE_LABELS = new Map<string, string>(MODULE_OPTIONS.map(o => [o.code, o.label]));

/** Módulo dueño de cada capacidad, para redactar el tooltip de un control bloqueado. */
const OWNING_MODULE = new Map<string, ModuleCode>();
for (const code of Object.keys(MODULE_CAPABILITIES) as ModuleCode[]) {
  for (const capability of MODULE_CAPABILITIES[code]) {
    if (!OWNING_MODULE.has(capability)) {
      OWNING_MODULE.set(capability, code);
    }
  }
}

/** Mensaje específico para un control deshabilitado por falta de permisos. */
export function capabilityDeniedMessage(capability: string): string {
  if (capability === Capability.PROFESIONALES_DELETE) {
    return 'Solo el dueño de la organización puede eliminar profesionales';
  }
  const owner = OWNING_MODULE.get(capability);
  const label = owner ? MODULE_LABELS.get(owner) ?? owner : null;
  return label ? `Requiere acceso a ${label}` : 'No tenés permiso para esta acción';
}
