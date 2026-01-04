import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map, catchError, of } from 'rxjs';
import { Appointment, AppointmentCreateDTO, AppointmentStatus, AppointmentCountByDate } from '../models';
import { API_CONFIG } from './api.config';
import { skipGlobalErrorHandler } from '../interceptors/http-context';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;
  
  // Cache local de turnos
  private appointmentsCache$ = new BehaviorSubject<Appointment[]>([]);

  constructor(private http: HttpClient) {
    this.loadAppointments();
  }

  /**
   * Cargar todos los turnos del backend
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  loadAppointments(skipGlobal: boolean = false): void {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    this.http.get<Appointment[]>(this.apiUrl, context ? { context } : undefined).pipe(
      catchError((err) => {
        console.error('Error loading appointments:', err);
        // Emitir array vacío en caso de error para evitar que el cache quede en estado inconsistente
        // El componente manejará el error a través de la suscripción
        return of([]);
      })
    ).subscribe({
      next: (appointments) => this.appointmentsCache$.next(appointments)
    });
  }

  /**
   * Obtener turnos del cache (observable)
   */
  getAppointments(): Observable<Appointment[]> {
    return this.appointmentsCache$.asObservable();
  }

  /**
   * Obtener todos los turnos del backend
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  findAll(skipGlobal: boolean = false): Observable<Appointment[]> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.get<Appointment[]>(this.apiUrl, context ? { context } : undefined).pipe(
      tap(appointments => this.appointmentsCache$.next(appointments))
    );
  }

  /**
   * Obtener turno por ID
   */
  findById(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener turnos por fecha
   */
  findByDate(fecha: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/date/${fecha}`);
  }

  /**
   * Obtener turnos de un paciente
   */
  findByPatient(patientId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  /**
   * Obtener turnos en rango de fechas
   */
  findByDateRange(startDate: string, endDate: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/range`, {
      params: { startDate, endDate }
    });
  }

  /**
   * Obtener conteo de turnos por fecha (para calendario)
   */
  getAppointmentCountByDateRange(startDate: string, endDate: string): Observable<AppointmentCountByDate> {
    return this.http.get<AppointmentCountByDate>(`${this.apiUrl}/count`, {
      params: { startDate, endDate }
    });
  }

  /**
   * Crear nuevo turno
   * @param appointment - Datos del turno a crear
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  create(appointment: AppointmentCreateDTO, skipGlobal: boolean = false): Observable<Appointment> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.post<Appointment>(this.apiUrl, appointment, context ? { context } : undefined).pipe(
      tap(() => this.loadAppointments())
    );
  }

  /**
   * Actualizar parcialmente un turno (precios, observaciones, etc.)
   * Usa PATCH contra el backend.
   */
  update(id: number, appointment: Partial<AppointmentCreateDTO>): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}`, appointment).pipe(
      tap(() => this.loadAppointments())
    );
  }

  /**
   * Eliminar turno
   * @param id - ID del turno a eliminar
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  delete(id: number, skipGlobal: boolean = false): Observable<void> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.delete<void>(`${this.apiUrl}/${id}`, context ? { context } : undefined).pipe(
      tap(() => this.loadAppointments())
    );
  }

  /**
   * Cambiar estado del turno
   */
  updateStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, null, {
      params: { status }
    }).pipe(
      tap(() => this.loadAppointments())
    );
  }

  /**
   * Agregar pago a un turno
   */
  addPayment(id: number, montoPago: number): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/addPayment`, {
      montoPago
    }).pipe(
      tap(() => this.loadAppointments())
    );
  }

  /**
   * Obtener turnos para una fecha específica (del cache)
   */
  getAppointmentsForDate(date: string): Appointment[] {
    return this.appointmentsCache$.value.filter(app => app.fecha === date);
  }

  /**
   * Obtener todos los turnos del cache
   */
  getAllAppointments(): Appointment[] {
    return this.appointmentsCache$.value;
  }
}
