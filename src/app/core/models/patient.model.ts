/**
 * Modelo de Paciente - Coincide con PatientDTO del backend
 */
export interface Patient {
  id?: number;
  nombreApellido: string;
  fechaNacimiento?: string; // formato: YYYY-MM-DD
  dni: string;
  telefono?: string;
  email?: string;
  domicilio?: string;
  localidad?: string;
  contactoEmergencia?: string;
  anamnesis?: string;
  // Obra Social
  obraSocialNombre?: string;
  planCategoria?: string;
  obraSocialNumero?: string;
  obraSocialVencimiento?: string;
  esTitular?: boolean;
  nombreTitular?: string;
  dniTitular?: string;
  parentesco?: string;
}

/**
 * DTO para crear/actualizar paciente
 */
export type PatientCreateDTO = Omit<Patient, 'id'>;
export type PatientUpdateDTO = Partial<PatientCreateDTO>;

