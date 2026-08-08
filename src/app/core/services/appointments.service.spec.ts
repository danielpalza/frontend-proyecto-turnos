import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { AppointmentsService } from './appointments.service';
import { ErrorHandlerService } from './error-handler.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { API_CONFIG } from './api.config';
import { Appointment } from '../models';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    fecha: '2026-08-07',
    hora: '10:00:00',
    estado: 'PENDIENTE',
    patientNombre: 'Ana',
    patientApellido: 'García',
    profesionalNombre: 'Juan',
    profesionalApellido: 'Pérez',
    ...overrides
  } as Appointment;
}

describe('AppointmentsService', () => {
  let httpMock: HttpTestingController;
  let notification: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };
  let errorHandler: { getErrorMessage: ReturnType<typeof vi.fn>; isNetworkError: ReturnType<typeof vi.fn> };
  let auth: { loggedOut$: Subject<void> };
  let service: AppointmentsService;

  beforeEach(() => {
    notification = { showError: vi.fn(), showSuccess: vi.fn() };
    errorHandler = { getErrorMessage: vi.fn(() => 'mensaje'), isNetworkError: vi.fn(() => false) };
    auth = { loggedOut$: new Subject<void>() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandlerService, useValue: errorHandler },
        { provide: NotificationService, useValue: notification },
        { provide: AuthService, useValue: auth }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AppointmentsService);
  });

  afterEach(() => httpMock.verify());

  it('el constructor NO dispara ningún HTTP (a diferencia de Patient/Profesional/Configuration)', () => {
    httpMock.expectNone(() => true);
  });

  describe('getFilteredAppointments()', () => {
    beforeEach(() => {
      service.findAll().subscribe();
      httpMock.expectOne(apiUrl).flush([
        appointment({ id: 'a1', estado: 'PENDIENTE', totalPrecio: 100 }),
        appointment({ id: 'a2', estado: 'CANCELADO', totalPrecio: 0 }),
        appointment({ id: 'a3', estado: 'COMPLETADO', totalPrecio: 0 })
      ]);
    });

    it('combina los 3 checkboxes con OR, no AND', () => {
      service.setFilterPendingOnly(true);
      service.setFilterCanceladosOnly(true);

      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));

      expect(result.map(a => a.id).sort()).toEqual(['a1', 'a2']);
    });

    it('sin ningún checkbox activo, no filtra por estado', () => {
      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result).toHaveLength(3);
    });

    it('el filtro de texto se aplica sobre el resultado ya filtrado por checkboxes', () => {
      service.setFilter('patient', 'ana');
      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result.map(a => a.id)).toEqual(['a1', 'a2', 'a3']);
    });
  });

  describe('loadAppointmentsForMonth()', () => {
    it('dos llamadas rápidas: switchMap cancela la primera, solo la segunda llega al cache', () => {
      service.loadAppointmentsForMonth(2026, 0);
      const firstReq = httpMock.expectOne(req => req.url === `${apiUrl}/range`);

      service.loadAppointmentsForMonth(2026, 1);
      const secondReq = httpMock.expectOne(req => req.url === `${apiUrl}/range` && req !== firstReq.request);

      // La primera request queda cancelada por el switchMap (Angular ni siquiera deja flushearla,
      // confirmando la cancelación); solo la segunda debe llegar al cache.
      expect(firstReq.cancelled).toBe(true);
      secondReq.flush([appointment({ id: 'de-febrero' })]);

      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result.map(a => a.id)).toEqual(['de-febrero']);
    });

    it('un error en la carga del mes emite por loadError$ sin romper cargas futuras', () => {
      let error: unknown;
      service.loadError$.subscribe(e => (error = e));

      service.loadAppointmentsForMonth(2026, 0);
      httpMock.expectOne(req => req.url === `${apiUrl}/range`).flush('err', { status: 500, statusText: 'Error' });
      expect(error).toBeTruthy();

      service.loadAppointmentsForMonth(2026, 1);
      httpMock.expectOne(req => req.url === `${apiUrl}/range`).flush([appointment({ id: 'ok' })]);

      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result.map(a => a.id)).toEqual(['ok']);
    });
  });

  describe('mutaciones locales del cache (sin refetch completo)', () => {
    it('delete() NO saca el turno del cache: lo marca CANCELADO (cancelación lógica)', () => {
      service.findAll().subscribe();
      httpMock.expectOne(apiUrl).flush([appointment({ id: 'a1', estado: 'PENDIENTE' })]);

      service.delete('a1', true).subscribe();
      httpMock.expectOne(`${apiUrl}/a1`).flush(null);

      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result).toHaveLength(1);
      expect(result[0].estado).toBe('CANCELADO');
    });

    it('create() agrega el nuevo turno al cache existente', () => {
      service.findAll().subscribe();
      httpMock.expectOne(apiUrl).flush([appointment({ id: 'a1' })]);

      service.create({ patientId: 'p1' } as never).subscribe();
      httpMock.expectOne(req => req.method === 'POST' && req.url === apiUrl).flush(appointment({ id: 'a2' }));

      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result.map(a => a.id).sort()).toEqual(['a1', 'a2']);
    });
  });

  describe('addPaymentWithFeedback()', () => {
    it('con monto <= 0: corta del lado cliente, cero requests HTTP', () => {
      service.addPaymentWithFeedback('a1', 0).subscribe();
      httpMock.expectNone(() => true);
      expect(notification.showError).toHaveBeenCalled();
    });

    it('404: no notifica pero relanza el error', () => {
      let caught: unknown;
      service.addPaymentWithFeedback('a1', 100).subscribe({ error: e => (caught = e) });
      httpMock.expectOne(`${apiUrl}/a1/addPayment`).flush('nf', { status: 404, statusText: 'Not Found' });

      expect(notification.showError).not.toHaveBeenCalled();
      expect(caught).toBeTruthy();
    });

    it('error de red: no notifica pero relanza', () => {
      errorHandler.isNetworkError.mockReturnValue(true);
      let caught: unknown;
      service.addPaymentWithFeedback('a1', 100).subscribe({ error: e => (caught = e) });
      httpMock.expectOne(`${apiUrl}/a1/addPayment`).flush('err', { status: 0, statusText: 'Unknown' });

      expect(notification.showError).not.toHaveBeenCalled();
      expect(caught).toBeTruthy();
    });

    it('otro error (500): notifica con el contexto Y relanza', () => {
      let caught: unknown;
      service.addPaymentWithFeedback('a1', 100).subscribe({ error: e => (caught = e) });
      httpMock.expectOne(`${apiUrl}/a1/addPayment`).flush('err', { status: 500, statusText: 'Error' });

      expect(notification.showError).toHaveBeenCalled();
      expect(caught).toBeTruthy();
    });

    it('éxito: muestra un toast de éxito', () => {
      service.addPaymentWithFeedback('a1', 100).subscribe();
      httpMock.expectOne(`${apiUrl}/a1/addPayment`).flush(appointment());
      expect(notification.showSuccess).toHaveBeenCalled();
    });
  });

  describe('update() / updateStatus() / addPayment() (directos, sin feedback)', () => {
    beforeEach(() => {
      service.findAll().subscribe();
      httpMock.expectOne(apiUrl).flush([appointment({ id: 'a1' })]);
    });

    it('update() actualiza el turno correspondiente en el cache por id', () => {
      service.update('a1', { observaciones: 'nuevo' }).subscribe();
      httpMock.expectOne(`${apiUrl}/a1`).flush(appointment({ id: 'a1', observaciones: 'nuevo' }));

      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result[0].observaciones).toBe('nuevo');
    });

    it('updateStatus() hace PATCH a /:id/status con el status como query param', () => {
      service.updateStatus('a1', 'EN_CURSO').subscribe();
      const req = httpMock.expectOne(r => r.url === `${apiUrl}/a1/status`);
      expect(req.request.params.get('status')).toBe('EN_CURSO');
      req.flush(appointment({ id: 'a1', estado: 'EN_CURSO' }));
    });

    it('addPayment() directo (sin feedback) actualiza el cache igual que la versión con feedback', () => {
      service.addPayment('a1', 50).subscribe();
      httpMock.expectOne(`${apiUrl}/a1/addPayment`).flush(appointment({ id: 'a1', montoPago: 50 }));

      let result: Appointment[] = [];
      service.getFilteredAppointments().subscribe(r => (result = r));
      expect(result[0].montoPago).toBe(50);
    });
  });

  describe('updateWithFeedback()', () => {
    it('404: no notifica pero relanza', () => {
      let caught: unknown;
      service.updateWithFeedback('a1', {}, 'Actualizado', 'actualizar el turno').subscribe({ error: e => (caught = e) });
      httpMock.expectOne(`${apiUrl}/a1`).flush('nf', { status: 404, statusText: 'Not Found' });
      expect(notification.showError).not.toHaveBeenCalled();
      expect(caught).toBeTruthy();
    });

    it('otro error notifica con el contexto dado y relanza', () => {
      let caught: unknown;
      service.updateWithFeedback('a1', {}, 'Actualizado', 'actualizar el turno').subscribe({ error: e => (caught = e) });
      httpMock.expectOne(`${apiUrl}/a1`).flush('err', { status: 500, statusText: 'Error' });
      expect(notification.showError).toHaveBeenCalled();
      expect(caught).toBeTruthy();
    });

    it('éxito: muestra el mensaje de éxito dado', () => {
      service.updateWithFeedback('a1', {}, 'Actualizado correctamente', 'actualizar el turno').subscribe();
      httpMock.expectOne(`${apiUrl}/a1`).flush(appointment());
      expect(notification.showSuccess).toHaveBeenCalledWith('Actualizado correctamente');
    });
  });

  describe('otros finders (verbo + URL exacta)', () => {
    it('findById', () => {
      service.findById('a1').subscribe();
      httpMock.expectOne(`${apiUrl}/a1`).flush(appointment());
    });

    it('findByDate', () => {
      service.findByDate('2026-08-07').subscribe();
      httpMock.expectOne(`${apiUrl}/date/2026-08-07`).flush([]);
    });

    it('findByPatient', () => {
      service.findByPatient('p1').subscribe();
      httpMock.expectOne(`${apiUrl}/patient/p1`).flush([]);
    });

    it('getSeguimientoResumen', () => {
      service.getSeguimientoResumen().subscribe();
      httpMock.expectOne(`${apiUrl}/seguimiento-resumen`).flush([]);
    });

    it('getAppointmentCountByDateRange', () => {
      service.getAppointmentCountByDateRange('2026-08-01', '2026-08-31').subscribe();
      httpMock.expectOne(r => r.url === `${apiUrl}/count`).flush({});
    });
  });

  describe('checkAvailability()', () => {
    it('un {available:false} es una respuesta exitosa (200), no un error', () => {
      let result: boolean | undefined;
      service.checkAvailability('prof-1', '2026-08-07', '10:00:00').subscribe(r => (result = r));
      httpMock.expectOne(req => req.url === `${apiUrl}/check-availability`).flush({ available: false });
      expect(result).toBe(false);
    });

    it('un error de red SÍ se propaga (a diferencia del resto del servicio, esto no se atrapa)', () => {
      let caught: unknown;
      service.checkAvailability('prof-1', '2026-08-07', '10:00:00').subscribe({ error: e => (caught = e) });
      httpMock.expectOne(req => req.url === `${apiUrl}/check-availability`).flush('err', { status: 0, statusText: 'Unknown' });
      expect(caught).toBeTruthy();
    });
  });
});
