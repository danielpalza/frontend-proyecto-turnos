import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { ConfigurationService } from './configuration.service';
import { AuthService } from './auth.service';
import { API_CONFIG } from './api.config';
import { Configuration } from '../models';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.configuration}`;
const DEFAULT_TEMPLATE = 'Hola {paciente}, te hablamos de la clinica, te recordamos tu turno del {fecha} a las {hora} con {profesional}.';

function makeAuthMock() {
  return { currentUser$: new Subject<unknown>(), loggedOut$: new Subject<void>() };
}

describe('ConfigurationService', () => {
  let httpMock: HttpTestingController;
  let auth: ReturnType<typeof makeAuthMock>;

  beforeEach(() => {
    auth = makeAuthMock();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: auth }]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('la carga inicial se dispara al emitir un usuario', () => {
    const service = TestBed.inject(ConfigurationService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush({ mensajeWhatsapp: 'Hola custom' } as Configuration);

    expect(service.getMensajeWhatsapp()).toBe('Hola custom');
  });

  it('cualquier error en la carga inicial cae en silencio al DEFAULT_TEMPLATE, sin notificar', () => {
    const service = TestBed.inject(ConfigurationService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush('err', { status: 500, statusText: 'Error' });

    expect(service.getMensajeWhatsapp()).toBe(DEFAULT_TEMPLATE);
  });

  it('getMensajeWhatsapp() con mensajeWhatsapp vacío (falsy) cae al default, no solo con null/undefined', () => {
    const service = TestBed.inject(ConfigurationService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush({ mensajeWhatsapp: '' } as Configuration);

    expect(service.getMensajeWhatsapp()).toBe(DEFAULT_TEMPLATE);
  });

  it('buildMessage reemplaza {profesional} y también el alias legado {doctor}', () => {
    const service = TestBed.inject(ConfigurationService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush({ mensajeWhatsapp: 'Turno con {doctor} el {fecha}' } as Configuration);

    const message = service.buildMessage('10:00', '07/08', 'Dr. Pérez', 'Ana');
    expect(message).toBe('Turno con Dr. Pérez el 07/08');
  });

  describe('buildWhatsAppLink()', () => {
    let service: ConfigurationService;
    beforeEach(() => {
      service = TestBed.inject(ConfigurationService);
      auth.currentUser$.next({});
      httpMock.expectOne(apiUrl).flush({ mensajeWhatsapp: DEFAULT_TEMPLATE } as Configuration);
    });

    it('teléfono vacío o solo espacios: null', () => {
      expect(service.buildWhatsAppLink('', { hora: '', fecha: '', profesional: '', paciente: '' })).toBeNull();
      expect(service.buildWhatsAppLink('   ', { hora: '', fecha: '', profesional: '', paciente: '' })).toBeNull();
    });

    it('teléfono que tras sacar el formato queda vacío: null', () => {
      expect(service.buildWhatsAppLink('(-)', { hora: '', fecha: '', profesional: '', paciente: '' })).toBeNull();
    });

    it('un teléfono válido arma un link a wa.me con el mensaje codificado', () => {
      const link = service.buildWhatsAppLink('+54 11 1234-5678', {
        hora: '10:00', fecha: '07/08', profesional: 'Dr. Pérez', paciente: 'Ana'
      });
      expect(link).toContain('https://wa.me/541112345678');
      expect(link).toContain('text=');
    });
  });

  it('formatAppointmentDate parsea como medianoche local (DD/MM/AAAA)', () => {
    const service = TestBed.inject(ConfigurationService);
    expect(service.formatAppointmentDate('2026-08-07')).toBe('07/08/2026');
  });
});
