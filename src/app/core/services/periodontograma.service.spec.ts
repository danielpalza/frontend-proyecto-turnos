import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PeriodontogramaService } from './periodontograma.service';
import { API_CONFIG } from './api.config';

const appointmentsBase = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;
const patientsBase = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.patients}`;

describe('PeriodontogramaService', () => {
  let service: PeriodontogramaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PeriodontogramaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getByAppointment usa la base de appointments (GET /appointments/:id/periodontogram)', () => {
    service.getByAppointment('apt-1').subscribe();
    const req = httpMock.expectOne(`${appointmentsBase}/apt-1/periodontogram`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('saveDelta usa PATCH sobre el mismo endpoint', () => {
    service.saveDelta('apt-1', {}).subscribe();
    const req = httpMock.expectOne(`${appointmentsBase}/apt-1/periodontogram`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('getEstadoActual usa la base de PATIENTS, no la de appointments', () => {
    service.getEstadoActual('patient-1').subscribe();
    const req = httpMock.expectOne(`${patientsBase}/patient-1/periodontogram/estado-actual`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
