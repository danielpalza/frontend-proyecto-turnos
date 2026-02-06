import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map, catchError, of, combineLatest, EMPTY, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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

  // Estado de filtro para calendario (paciente / profesional)
  private filterType$ = new BehaviorSubject<'patient' | 'profesional' | 'none'>('none');
  private filterTerm$ = new BehaviorSubject<string>('');
  // Filtro saldo pendiente de pago
  private filterPendingOnly$ = new BehaviorSubject<boolean>(false);

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

  /** Fuerza que getFilteredAppointments() vuelva a pedir datos al backend (p. ej. tras crear/actualizar/eliminar). */
  private refreshFiltered(): void {
    this.filterPendingOnly$.next(this.filterPendingOnly$.getValue());
  }

  /**
   * Obtener turnos desde el backend.
   * Además actualiza el cache interno.
   */
  getAppointments(): Observable<Appointment[]> {
    return this.findAll();
  }

  /**
   * Establecer filtro actual para el calendario
   * @param type Tipo de filtro: patient | profesional | none
   * @param term Texto a buscar
   */
  setFilter(type: 'patient' | 'profesional' | 'none', term: string): void {
    this.filterType$.next(type);
    this.filterTerm$.next((term || '').toLowerCase());
  }

  /**
   * Establecer filtro de turnos con saldo pendiente de pago.
   * Cuando es true, getFilteredAppointments() hará una petición al backend con pendingOnly=true.
   */
  setFilterPendingOnly(value: boolean): void {
    this.filterPendingOnly$.next(value);
  }

  /**
   * Obtener turnos filtrados según paciente / profesional y saldo pendiente.
   * Realiza una petición al backend (con pendingOnly si corresponde) y aplica el filtro
   * de tipo/term sobre el resultado recibido.
   */
  getFilteredAppointments(): Observable<Appointment[]> {
    return combineLatest([
      this.filterPendingOnly$,
      this.filterType$,
      this.filterTerm$
    ]).pipe(
      switchMap(([pendingOnly, type, term]) =>
        this.findAll(false, pendingOnly).pipe(
          map(appointments => {
            if (!term || type === 'none') {
              return appointments;
            }
            return appointments.filter(app => {
              const t = term.toLowerCase();
              if (type === 'patient') {
                const name = (app.patientName || '').toLowerCase();
                const dni = (app.patientDni || '').toLowerCase();
                const obraSocial = (app.patientObraSocialNumero || '').toLowerCase();
                return (
                  name.includes(t) ||
                  dni.includes(t) ||
                  obraSocial.includes(t)
                );
              }
              if (type === 'profesional') {
                const profesionalName = (app.profesionalName || '').toLowerCase();
                return profesionalName.includes(t);
              }
              return true;
            });
          })
        )
      )
    );
  }

  /**
   * Obtener todos los turnos del backend
   * @param skipGlobal - Si es true, el error será manejado específicamente por el componente
   * @param pendingOnly - Si es true, solo devuelve turnos con saldo pendiente (totalPrecio > 0)
   */
  findAll(skipGlobal: boolean = false, pendingOnly: boolean = false): Observable<Appointment[]> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    const options: { context?: HttpContext; params?: { pendingOnly: string } } = {};
    if (context) options.context = context;
    if (pendingOnly) options.params = { pendingOnly: 'true' };
    return this.http.get<Appointment[]>(this.apiUrl, Object.keys(options).length ? options : undefined).pipe(
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
      tap(() => this.refreshFiltered())
    );
  }

  /**
   * Actualizar parcialmente un turno (precios, observaciones, etc.)
   * Usa PATCH contra el backend.
   */
  update(id: number, appointment: Partial<AppointmentCreateDTO>): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}`, appointment).pipe(
      tap(() => this.refreshFiltered())
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
      tap(() => this.refreshFiltered())
    );
  }

  /**
   * Cambiar estado del turno
   */
  updateStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, null, {
      params: { status }
    }).pipe(
      tap(() => this.refreshFiltered())
    );
  }

  /**
   * Agregar pago a un turno
   */
  addPayment(id: number, montoPago: number): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/addPayment`, {
      montoPago
    }).pipe(
      tap(() => this.refreshFiltered())
    );
  }

  /**
   * Agregar pago con validación y notificaciones (para uso compartido en varios módulos).
   * Valida monto > 0, muestra éxito/error y devuelve el turno actualizado.
   */
  addPaymentWithFeedback(id: number, montoPago: number): Observable<Appointment> {
    if (montoPago <= 0) {
      this.notification.showError('El monto del pago debe ser mayor a cero.');
      return EMPTY;
    }
    return this.addPayment(id, montoPago).pipe(
      tap(() => this.notification.showSuccess('Pago agregado correctamente.')),
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 404) {
          const message = this.errorHandler.getErrorMessage(err, 'agregar el pago');
          if (!this.errorHandler.isNetworkError(err)) {
            this.notification.showError(message);
          }
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * Actualizar turno con notificaciones de éxito/error (para uso compartido en varios módulos).
   * @param errorContext Texto para el mensaje de error (ej: 'actualizar las observaciones')
   */
  updateWithFeedback(
    id: number,
    appointment: Partial<AppointmentCreateDTO>,
    successMessage: string,
    errorContext: string
  ): Observable<Appointment> {
    return this.update(id, appointment).pipe(
      tap(() => this.notification.showSuccess(successMessage)),
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 404) {
          const message = this.errorHandler.getErrorMessage(err, errorContext);
          if (!this.errorHandler.isNetworkError(err)) {
            this.notification.showError(message);
          }
        }
        return throwError(() => err);
      })
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
   * Obtener turnos para una fecha específica desde el backend.
   */
  getAppointmentsForDate(date: string): Observable<Appointment[]> {
    return this.findByDate(date);
  }

  /**
   * Obtener todos los turnos desde el backend.
   * Mantiene también actualizado el cache interno.
   */
  getAllAppointments(): Observable<Appointment[]> {
    return this.findAll();
  }
}
