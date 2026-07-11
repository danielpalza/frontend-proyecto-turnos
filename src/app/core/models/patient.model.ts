/**
 * Modelo de Paciente - Coincide con PatientDTO del backend
 */
export interface Patient {
  id?: string;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string; // formato: YYYY-MM-DD
  dni: string;
  telefono?: string;
  email?: string;
  domicilio?: string;
  localidad?: string;
  contactoEmergencia?: string;
  anamnesis?: string;
  // Cobertura
  /** Referencia al catálogo global de coberturas (tabla coberturas). Null/undefined = texto libre sin vincular. */
  coberturaId?: string;
  coberturaNombre?: string;
  planCategoria?: string;
  coberturaNumero?: string;
  coberturaVencimiento?: string;
  esTitular?: boolean;
  nombreTitular?: string;
  dniTitular?: string;
  parentesco?: string;
}

export type PatientCreateDTO = Omit<Patient, 'id'>;
export type PatientUpdateDTO = Partial<PatientCreateDTO>;