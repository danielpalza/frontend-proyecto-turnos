import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadoProfesional } from '../models';
import { API_CONFIG } from './api.config';

@Injectable({ providedIn: 'root' })
export class EstadoProfesionalService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/estado-profesional`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<EstadoProfesional[]> {
    return this.http.get<EstadoProfesional[]>(this.apiUrl);
  }
}

