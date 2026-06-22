/**
 * Modelo de Profesional - Coincide con ProfesionalDTO del backend
 */
export interface Profesional {
  id?: string;
  nombre: string;
  dni?: string;
  especialidad?: string;
  matricula?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  userId?: string;
}

export type ProfesionalCreateDTO = Omit<Profesional, 'id'>;
export type ProfesionalUpdateDTO = Partial<ProfesionalCreateDTO>;