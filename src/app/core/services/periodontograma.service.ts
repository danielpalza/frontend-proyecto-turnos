import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from './api.config';
import {
  PeriodontogramaDeltaRequest,
  PeriodontogramaEstadoActual,
  PeriodontogramaResponse
} from '../models/periodontograma.model';

@Injectable({ providedIn: 'root' })
export class PeriodontogramaService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;

  constructor(private http: HttpClient) {}

  getByAppointment(appointmentId: string): Observable<PeriodontogramaResponse> {
    return this.http.get<PeriodontogramaResponse>(`${this.baseUrl}/${appointmentId}/periodontogram`);
  }

  saveDelta(appointmentId: string, delta: PeriodontogramaDeltaRequest): Observable<PeriodontogramaResponse> {
    return this.http.patch<PeriodontogramaResponse>(`${this.baseUrl}/${appointmentId}/periodontogram`, delta);
  }

  getEstadoActual(patientId: string): Observable<PeriodontogramaEstadoActual> {
    return this.http.get<PeriodontogramaEstadoActual>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.patients}/${patientId}/periodontogram/estado-actual`
    );
  }
}