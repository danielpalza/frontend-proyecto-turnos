import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../core/services/api.config';
import { PlanType, Subscription, SubscriptionPaymentRow } from '../../core/models';
import { AdminUserDTO, OrganizationAdminDTO, OrganizationBillingDTO } from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin}`;

  constructor(private http: HttpClient) {}

  listarOrganizaciones(): Observable<OrganizationAdminDTO[]> {
    return this.http.get<OrganizationAdminDTO[]>(`${this.apiUrl}/organizations`);
  }

  obtenerOrganizacion(orgId: string): Observable<OrganizationAdminDTO> {
    return this.http.get<OrganizationAdminDTO>(`${this.apiUrl}/organizations/${orgId}`);
  }

  toggleOrganizacionActiva(orgId: string): Observable<OrganizationAdminDTO> {
    return this.http.patch<OrganizationAdminDTO>(`${this.apiUrl}/organizations/${orgId}/toggle-active`, {});
  }

  /** Mejorar de plan se aplica al instante; bajar queda agendado al cierre del período. */
  actualizarPlan(orgId: string, plan: PlanType): Observable<OrganizationAdminDTO> {
    return this.http.put<OrganizationAdminDTO>(`${this.apiUrl}/organizations/${orgId}/plan`, { plan });
  }

  actualizarModulos(orgId: string, moduleCodes: string[]): Observable<OrganizationAdminDTO> {
    return this.http.put<OrganizationAdminDTO>(`${this.apiUrl}/organizations/${orgId}/modules`, { moduleCodes });
  }

  listarUsuarios(orgId: string): Observable<AdminUserDTO[]> {
    return this.http.get<AdminUserDTO[]>(`${this.apiUrl}/organizations/${orgId}/users`);
  }

  toggleUsuarioActivo(orgId: string, userId: string): Observable<AdminUserDTO> {
    return this.http.patch<AdminUserDTO>(`${this.apiUrl}/organizations/${orgId}/users/${userId}/toggle-active`, {});
  }

  actualizarRolUsuario(orgId: string, userId: string, role: string): Observable<AdminUserDTO> {
    return this.http.put<AdminUserDTO>(`${this.apiUrl}/organizations/${orgId}/users/${userId}/role`, { role });
  }

  // --- Cobranza ---------------------------------------------------------------------------

  /** Estado de cobro de todas las organizaciones. */
  listarPagos(): Observable<OrganizationBillingDTO[]> {
    return this.http.get<OrganizationBillingDTO[]>(`${this.apiUrl}/pagos`);
  }

  listarPagosDeOrganizacion(orgId: string): Observable<SubscriptionPaymentRow[]> {
    return this.http.get<SubscriptionPaymentRow[]>(`${this.apiUrl}/organizations/${orgId}/pagos`);
  }

  /** Marca un período como pagado, al recibir la transferencia. */
  confirmarPago(orgId: string, periodoPagoId: string): Observable<Subscription> {
    return this.http.put<Subscription>(
      `${this.apiUrl}/organizations/${orgId}/pagos/${periodoPagoId}/confirmar`, {});
  }
}
