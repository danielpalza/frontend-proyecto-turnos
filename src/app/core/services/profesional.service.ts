import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Profesional, ProfesionalCreateDTO } from '../models';
import { API_CONFIG } from './api.config';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profesionales}`;
  
  // Cache local
  private profesionalesCache$ = new BehaviorSubject<Profesional[]>([]);

  constructor(private http: HttpClient) {
    this.loadProfesionales();
  }

  /**
   * Cargar profesionales del backend
   */
  loadProfesionales(): void {
    this.http.get<Profesional[]>(this.apiUrl).subscribe({
      next: (data) => this.profesionalesCache$.next(data),
      error: (err) => console.error('Error loading profesionales:', err)
    });
  }

  /**
   * Obtener profesionales del cache
   */
  getProfesionales(): Observable<Profesional[]> {
    return this.profesionalesCache$.asObservable();
  }

  /**
   * Obtener todos los profesionales
   */
  findAll(): Observable<Profesional[]> {
    return this.http.get<Profesional[]>(this.apiUrl).pipe(
      tap(data => this.profesionalesCache$.next(data))
    );
  }

  /**
   * Obtener solo profesionales activos
   */
  findAllActive(): Observable<Profesional[]> {
    return this.http.get<Profesional[]>(`${this.apiUrl}/active`);
  }

  /**
   * Obtener profesional por ID
   */
  findById(id: number): Observable<Profesional> {
    return this.http.get<Profesional>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear profesional
   */
  create(profesional: ProfesionalCreateDTO): Observable<Profesional> {
    return this.http.post<Profesional>(this.apiUrl, profesional).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  /**
   * Actualizar profesional
   */
  update(id: number, profesional: Partial<ProfesionalCreateDTO>): Observable<Profesional> {
    return this.http.put<Profesional>(`${this.apiUrl}/${id}`, profesional).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  /**
   * Eliminar profesional
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  /**
   * Alternar estado activo/inactivo
   */
  toggleActive(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/toggle-active`, {}).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  /**
   * Obtener lista para dropdown
   */
  getProfesionalesForDropdown(): Profesional[] {
    return this.profesionalesCache$.value.filter(p => p.activo !== false);
  }
}

