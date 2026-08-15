import { PaymentStatus, PlanType, SubscriptionStatus } from '../../core/models';

export interface ModuleGrantDTO {
  codigo: string;
  nombre: string;
  activo: boolean;
  fechaVencimiento: string | null;
}

export interface OrganizationAdminDTO {
  id: string;
  nombre: string;
  slug: string;
  pais: string;
  activa: boolean;
  createdAt: string;
  /** Plan real de la suscripción. Null si la organización todavía no tiene suscripción creada. */
  plan: PlanType | null;
  estadoSuscripcion: SubscriptionStatus | null;
  userCount: number;
  patientCount: number;
  appointmentCount: number;
  modules: ModuleGrantDTO[];
}

/**
 * Estado de cobro de una organización — coincide con `OrganizationBillingDTO` del backend.
 *
 * `estadoPago` viene calculado desde las fechas, no del crudo de la fila: el ciclo de facturación
 * avanza solo cuando alguien de esa clínica entra, así que un período todavía en PENDIENTE puede
 * estar vencido hace meses.
 */
export interface OrganizationBillingDTO {
  organizationId: string;
  nombre: string;
  slug: string;

  estadoSuscripcion: SubscriptionStatus;
  cancelacionDesde: string | null;
  fechaCancelacion: string | null;

  plan: PlanType;
  precio: number | null;
  moneda: string | null;

  /** Período impago más antiguo; null si está al día. Es lo que confirma el botón de cobro. */
  periodoPagoId: string | null;
  periodoActual: string | null;
  fechaVencimiento: string | null;
  estadoPago: PaymentStatus | null;
  diasVencido: number;

  soloLectura: boolean;
}

export interface AdminUserDTO {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  role: string;
  organizationId: string;
  organizationNombre: string;
}

export const ADMIN_ROLE_OPTIONS: { code: string; label: string }[] = [
  { code: 'OWNER', label: 'Dueño' },
  { code: 'ADMIN', label: 'Superadmin' },
  { code: 'USER', label: 'Usuario' }
];
