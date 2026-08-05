/** Espejo de `ModuleRulesDTO` — GET /api/modules/rules. Ver `docs/PERMISOS.md § 7.1`. */
export interface ClinicalModuleRule {
  /** Id real de la fila en `modules` — lo que hay que mandar como Appointment.moduloClinicoId. */
  id: string;
  codigo: string;
  nombre: string;
  /** Slug de ruta frontend, ej. "odontograma", "historia-clinica". */
  rutaClinica: string;
  /** Nombre de ícono de Bootstrap Icons, sin el prefijo "bi-". */
  icono?: string;
}

export interface ModulePreset {
  id: string;
  label: string;
  modules: string[];
}

export interface ModuleRulesResponse {
  moduleCapabilities: Record<string, string[]>;
  moduleImplications: Record<string, string[]>;
  presets: ModulePreset[];
  /** Módulos con ficha clínica propia (ruta + par VIEW/EDIT). */
  clinicalModules: ClinicalModuleRule[];
}
