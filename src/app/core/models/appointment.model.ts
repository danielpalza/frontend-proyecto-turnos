/**
 * Modelo de Turno - Coincide con AppointmentDTO del backend
 */
export interface Appointment {
  id?: string;
  patientId: string;
  profesionalId?: string;
  patientName?: string;
  patientDni?: string;
  patientObraSocialNumero?: string;
  profesionalName?: string;
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