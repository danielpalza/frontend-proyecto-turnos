import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateInvitationRequest, OrganizationInvitation } from '../models';
import { API_CONFIG } from './api.config';

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.invitations}`;

  constructor(private http: HttpClient) {}

  create(data: CreateInvitationRequest): Observable<OrganizationInvitation> {
    return this.http.post<OrganizationInvitation>(this.apiUrl, data);
  }

  findAll(): Observable<OrganizationInvitation[]> {
    return this.http.get<OrganizationInvitation[]>(this.apiUrl);
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
