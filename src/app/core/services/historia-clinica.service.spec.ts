import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HistoriaClinicaService } from './historia-clinica.service';
import { API_CONFIG } from './api.config';

const baseUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.appointments}`;

describe('HistoriaClinicaService', () => {
  let service: HistoriaClinicaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(HistoriaClinicaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getByAppointment hace GET a /appointments/:id/historia-clinica', () => {
    service.getByAppointment('apt-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/apt-1/historia-clinica`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('saveDraft hace PATCH a /appointments/:id/historia-clinica', () => {
    service.saveDraft('apt-1', { diagnostico: 'x' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/apt-1/historia-clinica`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ diagnostico: 'x' });
    req.flush({});
  });

  it('sign hace PATCH a /appointments/:id/historia-clinica/firmar', () => {
    service.sign('apt-1', {}).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/apt-1/historia-clinica/firmar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });
});
