/**
 * Modelo de Subscription - Coincide con SubscriptionDTO del backend
 */
export type PlanType = 'BASICO' | 'MEDIO' | 'PRO';
export type PaymentStatus = 'PENDIENTE' | 'PAGADO' | 'VENCIDO';

export interface Subscription {
  organizationId?: string;
  plan: PlanType;
  paymentAlias: string;

  /** Baja de plan agendada, o null si no hay ninguna. Las mejoras se aplican al instante. */
  planPendiente?: PlanType | null;
  /** Fecha en la que `planPendiente` pasa a estar vigente. */
  planPendienteDesde?: string | null;
  /** La baja agendada ya venció pero la organización no entra en el plan destino. */
  downgradePendienteBloqueado?: boolean;

  estadoPago: PaymentStatus;
  periodoActual?: string;
  fechaVencimiento?: string;
  fechaUltimoPago?: string;

  /** Días desde el vencimiento del impago más antiguo; 0 si está al día. */
  diasVencido?: number;
  /** Fecha a partir de la cual la organización queda en solo lectura. */
  fechaSoloLectura?: string | null;
  /** Ya está restringida a solo lectura por falta de pago. */
  soloLectura?: boolean;

  maxProfesionales: number;
  maxUsuarios: number;
  profesionalesActuales: number;
  usuariosActuales: number;
}

/** Fila del catálogo comercial - Coincide con PlanDTO del backend. */
export interface PlanCatalogItem {
  codigo: PlanType;
  nombre: string;
  descripcion?: string;
  maxProfesionales: number;
  maxUsuarios: number;
  /** Null mientras no se carguen los precios: la UI oculta el importe en ese caso. */
  precioMensual?: number | null;
  moneda?: string;
  orden: number;
}

/** Fila del historial de pagos - Coincide con SubscriptionPaymentDTO del backend. */
export interface SubscriptionPaymentRow {
  id: string;
  periodo: string;
  fechaVencimiento: string;
  fechaPago?: string | null;
  estado: PaymentStatus;
  /** Plan contratado durante ese período, congelado al abrirlo. */
  plan: PlanType;
  precio?: number | null;
  moneda?: string | null;
}
