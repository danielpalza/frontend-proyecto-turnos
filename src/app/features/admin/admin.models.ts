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
  planNombre: string | null;
  planPrecio: number | null;
  fechaContratacion: string | null;
  fechaUltimoPago: string | null;
  userCount: number;
  patientCount: number;
  appointmentCount: number;
  modules: ModuleGrantDTO[];
}

export interface OrganizationPlanUpdateDTO {
  planNombre?: string | null;
  planPrecio?: number | null;
  fechaContratacion?: string | null;
  fechaUltimoPago?: string | null;
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
