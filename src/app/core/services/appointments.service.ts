import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map, catchError, of } from 'rxjs';
import { Appointment, AppointmentCreateDTO, AppointmentStatus, AppointmentCountByDate } from '../models';
import { API_CONFIG } from './api.config';
import { skipGlobalErrorHandler } from '../interceptors/http-context';
import { ErrorHandlerService } from './error-handler.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;
  
  // Cache local de turnos
  private appointmentsCache$ = new BehaviorSubject<Appointment[]>([]);

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private notification: NotificationService
  ) {
    this.loadAppointments();
  }

  /**
   * Cargar todos los turnos del backend
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   */
  loadAppointments(skipGlobal: boolean = false): void {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    this.http.get<Appointment[]>(this.apiUrl, context ? { context } : undefined).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('Error loading appointments:', err);
        
        // Manejar errores 401/403 específicamente desde el backend
        // Los errores 404 se manejan completamente desde el backend sin notificaciones
        if (err.status === 401 || err.status === 403) {
          const message = this.errorHandler.getErrorMessage(err, 'cargar los turnos');
          this.notification.showError(message);
        }
        
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
   * Verificar si un horario está disponible para un profesional
   * @param profesionalId ID del profesional
   * @param fecha Fecha del turno (formato YYYY-MM-DD)
   * @param hora Hora del turno (formato HH:mm:ss)
   * @returns Observable que emite true si está disponible, false si está ocupado
   */
  checkAvailability(profesionalId: number, fecha: string, hora: string): Observable<boolean> {
    return this.http.get<{ available: boolean }>(`${this.apiUrl}/check-availability`, {
      params: {
        profesionalId: profesionalId.toString(),
        fecha: fecha,
        hora: hora
      }
    }).pipe(
      map(response => response.available),
      catchError((err: HttpErrorResponse) => {
        console.error('Error checking availability:', err);
        // En caso de error, asumir que no está disponible para ser conservador
        return of(false);
      })
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
