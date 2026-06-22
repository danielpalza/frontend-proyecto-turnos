import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { Profesional, ProfesionalCreateDTO } from '../models';
import { API_CONFIG } from './api.config';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profesionales}`;

  private profesionalesCache$ = new BehaviorSubject<Profesional[]>([]);

  constructor(private http: HttpClient) {
    this.loadProfesionales();
  }

  loadProfesionales(): void {
    this.http.get<Profesional[]>(this.apiUrl).pipe(
      catchError((err) => {
        console.error('Error loading profesionales:', err);
        return of([]);
      })
    ).subscribe({
      next: (data) => this.profesionalesCache$.next(data)
    });
  }

  getProfesionales(): Observable<Profesional[]> {
    return this.profesionalesCache$.asObservable();
  }

  findAll(): Observable<Profesional[]> {
    return this.http.get<Profesional[]>(this.apiUrl).pipe(
      tap(data => this.profesionalesCache$.next(data))
    );
  }

  findAllActive(): Observable<Profesional[]> {
    return this.http.get<Profesional[]>(`${this.apiUrl}/active`);
  }

  findById(id: string): Observable<Profesional> {
    return this.http.get<Profesional>(`${this.apiUrl}/${id}`);
  }

  create(profesional: ProfesionalCreateDTO): Observable<Profesional> {
    return this.http.post<Profesional>(this.apiUrl, profesional).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  update(id: string, profesional: Partial<ProfesionalCreateDTO>): Observable<Profesional> {
    return this.http.patch<Profesional>(`${this.apiUrl}/${id}`, profesional).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  toggleActive(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/toggle-active`, {}).pipe(
      tap(() => this.loadProfesionales())
    );
  }

  getProfesionalesForDropdown(): Profesional[] {
    return this.profesionalesCache$.value.filter(p => p.activo !== false);
  }
}