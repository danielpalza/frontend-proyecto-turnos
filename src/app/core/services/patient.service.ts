import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of, switchMap, filter } from 'rxjs';
import { Patient, PatientCreateDTO } from '../models';
import { API_CONFIG } from './api.config';
import { skipGlobalErrorHandler } from '../interceptors/http-context';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ErrorHandlerService } from './error-handler.service';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.patients}`;

  private patientsCache$ = new BehaviorSubject<Patient[]>([]);

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService
  ) {
    this.auth.currentUser$.pipe(
      filter(user => user !== null),
      switchMap(() => this.http.get<Patient[]>(this.apiUrl)),
      catchError((err) => {
        console.error('Error loading patients:', err);
        if (err?.status !== 404 && !this.errorHandler.isNetworkError(err)) {
          this.notification.showError(this.errorHandler.getErrorMessage(err, 'cargar los pacientes'));
        }
        return of(this.patientsCache$.value);
      })
    ).subscribe({
      next: (patients) => this.patientsCache$.next(patients)
    });

    this.auth.loggedOut$.subscribe(() => this.patientsCache$.next([]));
  }

  loadPatients(skipGlobal: boolean = false): void {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    this.http.get<Patient[]>(this.apiUrl, context ? { context } : undefined).pipe(
      catchError((err) => {
        console.error('Error loading patients:', err);
        return of(this.patientsCache$.value);
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

  findByIdentificacion(identificacion: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/identificacion/${identificacion}`);
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