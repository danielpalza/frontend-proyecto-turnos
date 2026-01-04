import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { Patient, PatientCreateDTO } from '../models';
import { API_CONFIG } from './api.config';
import { skipGlobalErrorHandler } from '../interceptors/http-context';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.patients}`;
  
  // Cache local de pacientes
  private patientsCache$ = new BehaviorSubject<Patient[]>([]);

  constructor(private http: HttpClient) {
    // Cargar pacientes al iniciar
    this.loadPatients();
  }

  /**
   * Cargar todos los pacientes del backend
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  loadPatients(skipGlobal: boolean = false): void {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    this.http.get<Patient[]>(this.apiUrl, context ? { context } : undefined).pipe(
      catchError((err) => {
        console.error('Error loading patients:', err);
        // Emitir array vacío en caso de error para evitar que el cache quede en estado inconsistente
        return of([]);
      })
    ).subscribe({
      next: (patients) => this.patientsCache$.next(patients)
    });
  }

  /**
   * Obtener pacientes del cache (observable)
   */
  getPatients(): Observable<Patient[]> {
    return this.patientsCache$.asObservable();
  }

  /**
   * Obtener todos los pacientes del backend
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  findAll(skipGlobal: boolean = false): Observable<Patient[]> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.get<Patient[]>(this.apiUrl, context ? { context } : undefined).pipe(
      tap(patients => this.patientsCache$.next(patients))
    );
  }

  /**
   * Obtener paciente por ID
   */
  findById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener paciente por DNI
   */
  findByDni(dni: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/dni/${dni}`);
  }

  /**
   * Buscar pacientes por texto (nombre, DNI o email)
   */
  search(query: string): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }

  /**
   * Crear nuevo paciente
   * @param patient - Datos del paciente a crear
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  create(patient: PatientCreateDTO, skipGlobal: boolean = false): Observable<Patient> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.post<Patient>(this.apiUrl, patient, context ? { context } : undefined).pipe(
      tap(() => this.loadPatients()) // Recargar cache
    );
  }

  /**
   * Actualizar paciente
   */
  update(id: number, patient: Partial<PatientCreateDTO>): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, patient).pipe(
      tap(() => this.loadPatients())
    );
  }

  /**
   * Eliminar paciente
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.loadPatients())
    );
  }

  /**
   * Obtener lista de pacientes para combobox
   */
  getPatientsForCombobox(): Patient[] {
    return this.patientsCache$.value;
  }
}

