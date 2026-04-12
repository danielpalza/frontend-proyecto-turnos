/**
 * Modelo de Turno - Coincide con AppointmentDTO del backend
 */
export interface Appointment {
  id?: number;
  patientId: number;
  profesionalId?: number;
  // Campos de solo lectura (vienen del backend)
  patientName?: string;
  patientDni?: string;
  patientObraSocialNumero?: string;
  profesionalName?: string;
  // Datos del turno
  fecha: string; // formato: YYYY-MM-DD
  hora?: string; // formato: HH:mm:ss
  estado?: AppointmentStatus;
  // Detalles de pago
  precioBono?: number;
  precioTratamiento?: number;
  extras?: number;
  montoPago?: number;
  totalPrecio?: number; // Campo calculado del backend: precioBono + precioTratamiento + extras - montoPago
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

/**
 * DTO para crear turno
 */
export interface AppointmentCreateDTO {
  patientId: number;
  profesionalId?: number;
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

/**
 * DTO para actualizaciones parciales (PATCH).
 * Incluye campos adicionales como unassignProfesional para desasignar.
 */
export interface AppointmentPartialUpdateDTO extends Partial<AppointmentCreateDTO> {
  unassignProfesional?: boolean;
}

/**
 * Conteo de turnos por fecha (para calendario)
 */
export type AppointmentCountByDate = Record<string, number>;

