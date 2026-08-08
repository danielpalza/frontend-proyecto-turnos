import { Patient } from './patient.model';

/**
 * Modelo de Turno - Coincide con AppointmentDTO del backend
 */
export interface Appointment {
  id?: string;
  patientId: string;
  profesionalId?: string;
  moduloClinicoId: string;
  patientNombre?: string;
  patientApellido?: string;
  patientIdentificacion?: string;
  patientCoberturaNumero?: string;
  profesionalNombre?: string;
  profesionalApellido?: string;
  moduloClinicoCodigo?: string;
  moduloClinicoNombre?: string;
  fecha: string;
  hora?: string;
  estado?: AppointmentStatus;
  precioBono?: number;
  precioTratamiento?: number;
  extras?: number;
  montoPago?: number;
  totalPrecio?: number;
  observaciones?: string;
  observacionesTurno?: string;
}

export type AppointmentStatus =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_CURSO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'NO_ASISTIO';

export interface AppointmentCreateDTO {
  patientId: string;
  profesionalId?: string;
  /** Obligatorio: qué ficha clínica corresponde a este turno (selección manual, sin default). */
  moduloClinicoId: string;
  fecha: string;
  hora?: string;
  estado?: AppointmentStatus;
  precioBono?: number;
  precioTratamiento?: number;
  extras?: number;
  montoPago?: number;
  observaciones?: string;
  observacionesTurno?: string;
}

export interface AppointmentPartialUpdateDTO extends Partial<AppointmentCreateDTO> {
  unassignProfesional?: boolean;
}

export type AppointmentCountByDate = Record<string, number>;

export interface PatientSeguimientoResumen {
  patientId: string;
  patientIdentificacion: string;
  totalAdeudado: number;
  totalTurnos: number;
  availableYears: number[];
}

/** Respuesta genérica de un endpoint paginado — ver PageResponseDTO en el backend. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * Fila de la Seguimiento paginada: un paciente con turnos en el rango desde/hasta consultado.
 * `totalAdeudado`/`totalTurnos` son históricos completos, no acotados al rango — ver
 * SeguimientoPatientDTO en el backend.
 */
export interface SeguimientoPatientGroup {
  patient: Patient;
  appointments: Appointment[];
  totalAdeudado: number;
  totalTurnos: number;
}