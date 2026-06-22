import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from './api.config';
import {
  OdontogramaDeltaRequest,
  OdontogramaEstadoActual,
  OdontogramaResponse,
  TurnoCompletoDeltaRequest,
  TurnoCompletoResponse
} from '../models/odontograma.model';

@Injectable({ providedIn: 'root' })
export class OdontogramaService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;

  constructor(private http: HttpClient) {}

  getByAppointment(appointmentId: string): Observable<OdontogramaResponse> {
    return this.http.get<OdontogramaResponse>(`${this.baseUrl}/${appointmentId}/odontogram`);
  }

  saveDelta(appointmentId: string, delta: OdontogramaDeltaRequest): Observable<OdontogramaResponse> {
    return this.http.patch<OdontogramaResponse>(`${this.baseUrl}/${appointmentId}/odontogram`, delta);
  }

  saveTurnoCompleto(appointmentId: string, delta: TurnoCompletoDeltaRequest): Observable<TurnoCompletoResponse> {
    return this.http.patch<TurnoCompletoResponse>(
      `${this.baseUrl}/${appointmentId}/turno-completo`, delta
    );
  }

  getEstadoActual(patientId: string): Observable<OdontogramaEstadoActual> {
    return this.http.get<OdontogramaEstadoActual>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.patients}/${patientId}/odontogram/estado-actual`
    );
  }
}