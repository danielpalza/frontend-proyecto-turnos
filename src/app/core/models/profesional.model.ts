/**
 * Modelo de Profesional - Coincide con ProfesionalDTO del backend
 */
export interface Profesional {
  id?: number;
  nombre: string;
  dni?: string;
  especialidad?: string;
  matricula?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  estado?: string;
  desde?: string;
  hasta?: string;
}

export type ProfesionalCreateDTO = Omit<Profesional, 'id'>;
