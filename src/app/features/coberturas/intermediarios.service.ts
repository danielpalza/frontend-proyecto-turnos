import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../core/services/api.config';
import { Intermediario, IntermediarioRequest } from './coberturas.models';

@Injectable({ providedIn: 'root' })
export class IntermediariosService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.intermediarios}`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Intermediario[]> {
    return this.http.get<Intermediario[]>(this.apiUrl);
  }

  crear(request: IntermediarioRequest): Observable<Intermediario> {
    return this.http.post<Intermediario>(this.apiUrl, request);
  }

  actualizar(id: string, request: IntermediarioRequest): Observable<Intermediario> {
    return this.http.put<Intermediario>(`${this.apiUrl}/${id}`, request);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
