import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, tap, map, catchError, of, combineLatest, EMPTY, throwError } from 'rxjs';
import { Appointment, AppointmentCreateDTO, AppointmentPartialUpdateDTO, AppointmentStatus, AppointmentCountByDate } from '../models';
import { API_CONFIG } from './api.config';
import { skipGlobalErrorHandler } from '../interceptors/http-context';
import { ErrorHandlerService } from './error-handler.service';
import { NotificationService } from './notification.service';
import { fullName } from '../utils/full-name.util';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;

  private appointmentsCache$ = new BehaviorSubject<Appointment[]>([]);

  private readonly loadErrorSubject = new Subject<any>();
  readonly loadError$ = this.loadErrorSubject.asObservable();

  private filterType$ = new BehaviorSubject<'patient' | 'profesional' | 'both' | 'none'>('none');
  private filterTerm$ = new BehaviorSubject<string>('');
  private filterPendingOnly$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private notification: NotificationService
  ) {}

  loadAppointments(skipGlobal: boolean = false): void {
    const context = skipGlobal ? skipGlobalErrorHandler() : undefined;
    this.http.get<Appointment[]>(this.apiUrl, context ? { context } : undefined).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('Error loading appointments:', err);
        if (err.status === 401 || err.status === 403) {
          const message = this.errorHandler.getErrorMessage(err, 'cargar los turnos');
          this.notification.showError(message);
        }
        return of([]);
      })
    ).subscribe({
      next: (appointments) => this.appointmentsCache$.next(appointments)
    });
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

  getFilteredAppointments(): Observable<Appointment[]> {
    return combineLatest([
      this.filterPendingOnly$,
      this.filterType$,
      this.filterTerm$,
      this.appointmentsCache$
    ]).pipe(
      map(([pendingOnly, type, term, appointments]) => {
        let filtered = appointments;
        if (pendingOnly) {
          filtered = filtered.filter(a => (a.totalPrecio ?? 0) > 0);
        }
        if (!term || type === 'none') {
          return filtered;
        }
        return filtered.filter(app => {
          const t = term.toLowerCase();
          if (type === 'both') {
            const name = fullName(app.patientNombre, app.patientApellido).toLowerCase();
            const dni = (app.patientDni || '').toLowerCase();
            const obraSocial = (app.patientObraSocialNumero || '').toLowerCase();
            const profesionalName = fullName(app.profesionalNombre, app.profesionalApellido).toLowerCase();
            return (
              name.includes(t) ||
              dni.includes(t) ||
              obraSocial.includes(t) ||
              profesionalName.includes(t)
            );
          }
          if (type === 'patient') {
            const name = fullName(app.patientNombre, app.patientApellido).toLowerCase();
            const dni = (app.patientDni || '').toLowerCase();
            const obraSocial = (app.patientObraSocialNumero || '').toLowerCase();
            return (
              name.includes(t) ||
              dni.includes(t) ||
              obraSocial.includes(t)
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

  update(id: string, appointment: AppointmentPartialUpdateDTO): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}`, appointment).pipe(
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
        const current = this.appointmentsCache$.getValue();
        this.appointmentsCache$.next(current.filter(a => a.id !== id));
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

  addPayment(id: string, montoPago: number): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/addPayment`, {
      montoPago
    }).pipe(
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

  updateWithFeedback(
    id: string,
    appointment: AppointmentPartialUpdateDTO,
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

  checkAvailability(profesionalId: string, fecha: string, hora: string): Observable<boolean> {
    return this.http.get<{ available: boolean }>(`${this.apiUrl}/check-availability`, {
      params: {
        profesionalId,
        fecha,
        hora
      }
    }).pipe(
      map(response => response.available),
      catchError((err: HttpErrorResponse) => {
        console.error('Error checking availability:', err);
        return of(false);
      })
    );
  }

  getAppointmentsForDate(date: string): Observable<Appointment[]> {
    return this.findByDate(date);
  }

  getAllAppointments(): Observable<Appointment[]> {
    return this.findAll();
  }

  loadAppointmentsForMonth(year: number, month: number): void {
    const start = this.formatDate(new Date(year, month, 1));
    const end = this.formatDate(new Date(year, month + 1, 0));
    this.findByDateRange(start, end).subscribe({
      next: appointments => {
        this.appointmentsCache$.next(appointments);
      },
      error: err => {
        this.loadErrorSubject.next(err);
      }
    });
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}