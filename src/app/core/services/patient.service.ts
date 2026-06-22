import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { Patient, PatientCreateDTO } from '../models';
import { API_CONFIG } from './api.config';
import { skipGlobalErrorHandler } from '../interceptors/http-context';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.patients}`;

  private patientsCache$ = new BehaviorSubject<Patient[]>([]);

  constructor(private http: HttpClient) {
    this.loadPatients();
  }

  loadPatients(skipGlobal: boolean = false): void {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    this.http.get<Patient[]>(this.apiUrl, context ? { context } : undefined).pipe(
      catchError((err) => {
        console.error('Error loading patients:', err);
        return of([]);
      })
    ).subscribe({
      next: (patients) => this.patientsCache$.next(patients)
    });
  }

  getPatients(): Observable<Patient[]> {
    return this.patientsCache$.asObservable();
  }

  findAll(skipGlobal: boolean = false): Observable<Patient[]> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.get<Patient[]>(this.apiUrl, context ? { context } : undefined).pipe(
      tap(patients => this.patientsCache$.next(patients))
    );
  }

  findById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  findByDni(dni: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/dni/${dni}`);
  }

  search(query: string): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }

  create(patient: PatientCreateDTO, skipGlobal: boolean = false): Observable<Patient> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.post<Patient>(this.apiUrl, patient, context ? { context } : undefined).pipe(
      tap(() => this.loadPatients())
    );
  }

  update(id: string, patient: Partial<PatientCreateDTO>): Observable<Patient> {
    return this.http.patch<Patient>(`${this.apiUrl}/${id}`, patient).pipe(
      tap(() => this.loadPatients())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.loadPatients())
    );
  }

  getPatientsForCombobox(): Patient[] {
    return this.patientsCache$.value;
  }
}