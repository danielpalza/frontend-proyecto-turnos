/**
 * Modelo de Profesional - Coincide con ProfesionalDTO del backend
 */
export interface Profesional {
  id?: string;
  nombre: string;
  apellido: string;
  identificacion?: string;
  especialidad?: string;
  matricula?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  userId?: string;
  moduleCodes?: string[];
}

/** Módulos habilitables para un usuario, alineados a las pestañas del navbar. */
export const MODULE_OPTIONS: { code: string; label: string }[] = [
  { code: 'PANEL', label: 'Panel' },
  { code: 'TURNOS', label: 'Turnos' },
  { code: 'ODONTOGRAMA', label: 'Odontograma' },
  { code: 'SEGUIMIENTO', label: 'Seguimiento' },
  { code: 'COBERTURA', label: 'Cobertura' },
  { code: 'CONFIGURACIONES', label: 'Configuración' }
];

export type ProfesionalCreateDTO = Omit<Profesional, 'id'> & {
  /** Si es true, se crea un User (rol USER) vinculado a este profesional. Solo lo puede pedir un OWNER. */
  crearAcceso?: boolean;
  username?: string;
  password?: string;
  moduleCodes?: string[];
};
export type ProfesionalUpdateDTO = Partial<ProfesionalCreateDTO>;