import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from './api.config';
import { HistoriaClinicaDeltaRequest, HistoriaClinicaResponse } from '../models/historia-clinica.model';

@Injectable({ providedIn: 'root' })
export class HistoriaClinicaService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;

  constructor(private http: HttpClient) {}

  getByAppointment(appointmentId: string): Observable<HistoriaClinicaResponse> {
    return this.http.get<HistoriaClinicaResponse>(`${this.baseUrl}/${appointmentId}/historia-clinica`);
  }

  /** "Guardar borrador": persiste el delta con la validación mínima únicamente. */
  saveDraft(appointmentId: string, delta: HistoriaClinicaDeltaRequest): Observable<HistoriaClinicaResponse> {
    return this.http.patch<HistoriaClinicaResponse>(`${this.baseUrl}/${appointmentId}/historia-clinica`, delta);
  }

  /** "Firmar y guardar": aplica el delta y bloquea el registro para siempre. No es idempotente. */
  sign(appointmentId: string, delta: HistoriaClinicaDeltaRequest): Observable<HistoriaClinicaResponse> {
    return this.http.patch<HistoriaClinicaResponse>(
      `${this.baseUrl}/${appointmentId}/historia-clinica/firmar`, delta
    );
  }
}
