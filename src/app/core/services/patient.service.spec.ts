import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { PatientService } from './patient.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ErrorHandlerService } from './error-handler.service';
import { API_CONFIG } from './api.config';
import { Patient } from '../models';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.patients}`;

function makeAuthMock() {
  return { currentUser$: new Subject<unknown>(), loggedOut$: new Subject<void>() };
}

describe('PatientService', () => {
  let httpMock: HttpTestingController;
  let auth: ReturnType<typeof makeAuthMock>;
  let notification: { showError: ReturnType<typeof vi.fn> };
  let errorHandler: { getErrorMessage: ReturnType<typeof vi.fn>; isNetworkError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = makeAuthMock();
    notification = { showError: vi.fn() };
    errorHandler = { getErrorMessage: vi.fn(() => 'mensaje'), isNetworkError: vi.fn(() => false) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notification },
        { provide: ErrorHandlerService, useValue: errorHandler }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('al emitir un usuario en currentUser$, carga los pacientes automáticamente', () => {
    const service = TestBed.inject(PatientService);
    auth.currentUser$.next({});

    httpMock.expectOne(apiUrl).flush([{ id: 'p1' }] as Patient[]);

    let patients: Patient[] = [];
    service.getPatients().subscribe(p => (patients = p));
    expect(patients).toEqual([{ id: 'p1' }]);
  });

  it('no dispara la carga mientras currentUser$ emite null', () => {
    TestBed.inject(PatientService);
    auth.currentUser$.next(null);
    httpMock.expectNone(apiUrl);
  });

  it('un 404 en la carga inicial no notifica', () => {
    TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush('not found', { status: 404, statusText: 'Not Found' });
    expect(notification.showError).not.toHaveBeenCalled();
  });

  it('un error de red en la carga inicial no notifica', () => {
    errorHandler.isNetworkError.mockReturnValue(true);
    TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush('err', { status: 0, statusText: 'Unknown' });
    expect(notification.showError).not.toHaveBeenCalled();
  });

  it('un 500 en la carga inicial SÍ notifica (DEUDA § 3.2)', () => {
    TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush('err', { status: 500, statusText: 'Error' });
    expect(notification.showError).toHaveBeenCalled();
  });

  it('loggedOut$ limpia el cache de pacientes', () => {
    const service = TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([{ id: 'p1' }] as Patient[]);

    auth.loggedOut$.next();

    let patients: Patient[] | undefined;
    service.getPatients().subscribe(p => (patients = p));
    expect(patients).toEqual([]);
  });

  it('loadPatients() nunca notifica, incluso ante un error 500 (a diferencia del constructor)', () => {
    const service = TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([]);

    service.loadPatients();
    httpMock.expectOne(apiUrl).flush('err', { status: 500, statusText: 'Error' });

    expect(notification.showError).not.toHaveBeenCalled();
  });

  it('create() dispara el POST y luego un refresco (loadPatients) — dos requests, no una', () => {
    const service = TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([]);

    let created: Patient | undefined;
    service.create({ nombre: 'Ana' } as Patient).subscribe(p => (created = p));

    const postReq = httpMock.expectOne(req => req.method === 'POST' && req.url === apiUrl);
    postReq.flush({ id: 'nuevo', nombre: 'Ana' });
    expect(created).toEqual({ id: 'nuevo', nombre: 'Ana' });

    httpMock.expectOne(req => req.method === 'GET' && req.url === apiUrl).flush([{ id: 'nuevo' }]);
  });

  it('findAll() también actualiza el cache por tap, aunque sea un método de lectura', () => {
    const service = TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([]);

    service.findAll().subscribe();
    httpMock.expectOne(apiUrl).flush([{ id: 'x' }] as Patient[]);

    let patients: Patient[] = [];
    service.getPatients().subscribe(p => (patients = p));
    expect(patients).toEqual([{ id: 'x' }]);
  });

  it('getPatientsForCombobox() es un snapshot síncrono del cache actual', () => {
    const service = TestBed.inject(PatientService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([{ id: 'p1' }] as Patient[]);

    expect(service.getPatientsForCombobox()).toEqual([{ id: 'p1' }]);
  });
});
