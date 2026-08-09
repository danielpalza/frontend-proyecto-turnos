import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../core/services/api.config';
import { AdminUserDTO, OrganizationAdminDTO, OrganizationPlanUpdateDTO } from './admin.models';

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

  actualizarPlan(orgId: string, dto: OrganizationPlanUpdateDTO): Observable<OrganizationAdminDTO> {
    return this.http.put<OrganizationAdminDTO>(`${this.apiUrl}/organizations/${orgId}/plan`, dto);
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
}
