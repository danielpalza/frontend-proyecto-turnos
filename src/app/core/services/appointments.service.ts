import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, tap, map, catchError, of, combineLatest, EMPTY, throwError, switchMap } from 'rxjs';
import { Appointment, AppointmentCreateDTO, AppointmentPartialUpdateDTO, AppointmentStatus, AppointmentCountByDate, PatientSeguimientoResumen } from '../models';
import { API_CONFIG } from './api.config';
import { skipGlobalErrorHandler } from '../interceptors/http-context';
import { ErrorHandlerService } from './error-handler.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { fullName } from '../utils/full-name.util';
import { formatDateToYYYYMMDD } from '../utils/date.utils';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;

  private appointmentsCache$ = new BehaviorSubject<Appointment[]>([]);

  private readonly loadErrorSubject = new Subject<any>();
  readonly loadError$ = this.loadErrorSubject.asObservable();

  private loadMonthRequest$ = new Subject<{ year: number; month: number }>();

  private filterType$ = new BehaviorSubject<'patient' | 'profesional' | 'both' | 'none'>('none');
  private filterTerm$ = new BehaviorSubject<string>('');
  private filterPendingOnly$ = new BehaviorSubject<boolean>(false);
  private filterPendientesOnly$ = new BehaviorSubject<boolean>(false);
  private filterCanceladosOnly$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private notification: NotificationService,
    private auth: AuthService
  ) {
    this.auth.loggedOut$.subscribe(() => this.appointmentsCache$.next([]));

    this.loadMonthRequest$.pipe(
      switchMap(({ year, month }) => {
        const start = formatDateToYYYYMMDD(new Date(year, month, 1));
        const end = formatDateToYYYYMMDD(new Date(year, month + 1, 0));
        return this.findByDateRange(start, end).pipe(
          catchError(err => {
            this.loadErrorSubject.next(err);
            return EMPTY;
          })
        );
      })
    ).subscribe(appointments => this.appointmentsCache$.next(appointments));
  }

  private refreshFiltered(): void {
    this.filterPendingOnly$.next(this.filterPendingOnly$.getValue());
  }

  getAppointments(): Observable<Appointment[]> {
    return this.findAll();
  }

  setFilter(type: 'patient' | 'profesional' | 'both' | 'none', term: string): void {
    this.filterType$.next(type);
    this.filterTerm$.next((term || '').toLowerCase());
  }

  setFilterPendingOnly(value: boolean): void {
    this.filterPendingOnly$.next(value);
  }

  setFilterPendientesOnly(value: boolean): void {
    this.filterPendientesOnly$.next(value);
  }

  setFilterCanceladosOnly(value: boolean): void {
    this.filterCanceladosOnly$.next(value);
  }

  getFilteredAppointments(): Observable<Appointment[]> {
    return combineLatest([
      this.filterPendingOnly$,
      this.filterPendientesOnly$,
      this.filterCanceladosOnly$,
      this.filterType$,
      this.filterTerm$,
      this.appointmentsCache$
    ]).pipe(
      map(([pendingOnly, pendientesOnly, canceladosOnly, type, term, appointments]) => {
        let filtered = appointments;
        if (pendingOnly || pendientesOnly || canceladosOnly) {
          filtered = filtered.filter(a =>
            (pendingOnly && (a.totalPrecio ?? 0) > 0) ||
            (pendientesOnly && a.estado === 'PENDIENTE') ||
            (canceladosOnly && (a.estado === 'CANCELADO' || a.estado === 'NO_ASISTIO'))
          );
        }
        if (!term || type === 'none') {
          return filtered;
        }
        return filtered.filter(app => {
          const t = term.toLowerCase();
          if (type === 'both') {
            const name = fullName(app.patientNombre, app.patientApellido).toLowerCase();
            const identificacion = (app.patientIdentificacion || '').toLowerCase();
            const cobertura = (app.patientCoberturaNumero || '').toLowerCase();
            const profesionalName = fullName(app.profesionalNombre, app.profesionalApellido).toLowerCase();
            return (
              name.includes(t) ||
              identificacion.includes(t) ||
              cobertura.includes(t) ||
              profesionalName.includes(t)
            );
          }
          if (type === 'patient') {
            const name = fullName(app.patientNombre, app.patientApellido).toLowerCase();
            const identificacion = (app.patientIdentificacion || '').toLowerCase();
            const cobertura = (app.patientCoberturaNumero || '').toLowerCase();
            return (
              name.includes(t) ||
              identificacion.includes(t) ||
              cobertura.includes(t)
            );
          }
          if (type === 'profesional') {
            const profesionalName = fullName(app.profesionalNombre, app.profesionalApellido).toLowerCase();
            return profesionalName.includes(t);
          }
          return true;
        });
      })
    );
  }

  findAll(skipGlobal: boolean = false, pendingOnly: boolean = false): Observable<Appointment[]> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    const options: { context?: HttpContext; params?: { pendingOnly: string } } = {};
    if (context) options.context = context;
    if (pendingOnly) options.params = { pendingOnly: 'true' };
    return this.http.get<Appointment[]>(this.apiUrl, Object.keys(options).length ? options : undefined).pipe(
      tap(appointments => this.appointmentsCache$.next(appointments))
    );
  }

  findById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  findByDate(fecha: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/date/${fecha}`);
  }

  findByPatient(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  findByDateRange(startDate: string, endDate: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/range`, {
      params: { startDate, endDate }
    });
  }

  getSeguimientoResumen(): Observable<PatientSeguimientoResumen[]> {
    return this.http.get<PatientSeguimientoResumen[]>(`${this.apiUrl}/seguimiento-resumen`);
  }

  getAppointmentCountByDateRange(startDate: string, endDate: string): Observable<AppointmentCountByDate> {
    return this.http.get<AppointmentCountByDate>(`${this.apiUrl}/count`, {
      params: { startDate, endDate }
    });
  }

  create(appointment: AppointmentCreateDTO, skipGlobal: boolean = false): Observable<Appointment> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.post<Appointment>(this.apiUrl, appointment, context ? { context } : undefined).pipe(
      tap((newAppointment) => {
        const current = this.appointmentsCache$.getValue();
        this.appointmentsCache$.next([...current, newAppointment]);
      })
    );
  }

  update(id: string, appointment: AppointmentPartialUpdateDTO, skipGlobal: boolean = false): Observable<Appointment> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}`, appointment, context ? { context } : undefined).pipe(
      tap((updated) => {
        const current = this.appointmentsCache$.getValue();
        this.appointmentsCache$.next(current.map(a => a.id === updated.id ? updated : a));
      })
    );
  }

  delete(id: string, skipGlobal: boolean = false): Observable<void> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.delete<void>(`${this.apiUrl}/${id}`, context ? { context } : undefined).pipe(
      tap(() => {
        // El backend no borra el turno: lo marca como CANCELADO (cancelación lógica).
        // Reflejamos lo mismo en el caché para que siga visible con su nuevo estado.
        const current = this.appointmentsCache$.getValue();
        this.appointmentsCache$.next(
          current.map(a => a.id === id ? { ...a, estado: 'CANCELADO' as AppointmentStatus } : a)
        );
      })
    );
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, null, {
      params: { status }
    }).pipe(
      tap((updated) => {
        const current = this.appointmentsCache$.getValue();
        this.appointmentsCache$.next(current.map(a => a.id === updated.id ? updated : a));
      })
    );
  }

  addPayment(id: string, montoPago: number, skipGlobal: boolean = false): Observable<Appointment> {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/addPayment`, {
      montoPago
    }, context ? { context } : undefined).pipe(
      tap((updated) => {
        const current = this.appointmentsCache$.getValue();
        this.appointmentsCache$.next(current.map(a => a.id === updated.id ? updated : a));
      })
    );
  }

  addPaymentWithFeedback(id: string, montoPago: number): Observable<Appointment> {
    if (montoPago <= 0) {
      this.notification.showError('El monto del pago debe ser mayor a cero.');
      return EMPTY;
    }
    return this.addPayment(id, montoPago, true).pipe(
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

  updateWithFeedback(
    id: string,
    appointment: AppointmentPartialUpdateDTO,
    successMessage: string,
    errorContext: string
  ): Observable<Appointment> {
    return this.update(id, appointment, true).pipe(
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

  checkAvailability(profesionalId: string, fecha: string, hora: string): Observable<boolean> {
    // No se traga el error acá: un fallo de red no es lo mismo que "horario ocupado",
    // y los componentes que llaman a esto ya distinguen ambos casos en su propio `error:`.
    return this.http.get<{ available: boolean }>(`${this.apiUrl}/check-availability`, {
      params: {
        profesionalId,
        fecha,
        hora
      }
    }).pipe(
      map(response => response.available)
    );
  }

  getAppointmentsForDate(date: string): Observable<Appointment[]> {
    return this.findByDate(date);
  }

  getAllAppointments(): Observable<Appointment[]> {
    return this.findAll();
  }

  loadAppointmentsForMonth(year: number, month: number): void {
    this.loadMonthRequest$.next({ year, month });
  }
}