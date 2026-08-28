import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { ProfesionalService } from './profesional.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ErrorHandlerService } from './error-handler.service';
import { API_CONFIG } from './api.config';
import { Capability } from '../auth/capabilities';
import { Profesional } from '../models';
import { createAuthServiceMock } from '../../../testing/auth-service.mock';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profesionales}`;

function makeAuthMock(hasCapability = false) {
  return createAuthServiceMock({
    currentUser$: new Subject<unknown>(),
    loggedOut$: new Subject<void>(),
    hasCapability: vi.fn(() => hasCapability)
  });
}

describe('ProfesionalService', () => {
  let httpMock: HttpTestingController;
  let auth: ReturnType<typeof makeAuthMock>;

  function setup(hasCapability: boolean) {
    auth = makeAuthMock(hasCapability);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        { provide: ErrorHandlerService, useValue: { getErrorMessage: vi.fn(() => 'x'), isNetworkError: vi.fn(() => false) } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('con PROFESIONALES:VIEW: la carga inicial pega al endpoint base', () => {
    setup(true);
    TestBed.inject(ProfesionalService);
    auth.currentUser$.next({});

    httpMock.expectOne(apiUrl).flush([]);
  });

  it('sin PROFESIONALES:VIEW: la carga inicial pega a /active (fix de DEUDA § 3.2)', () => {
    setup(false);
    TestBed.inject(ProfesionalService);
    auth.currentUser$.next({});

    httpMock.expectOne(`${apiUrl}/active`).flush([]);
  });

  it('el refresco tras create() respeta la misma bifurcación de capacidad', () => {
    setup(false);
    const service = TestBed.inject(ProfesionalService);
    auth.currentUser$.next({});
    httpMock.expectOne(`${apiUrl}/active`).flush([]);

    service.create({ nombre: 'X' } as Profesional).subscribe();
    httpMock.expectOne(req => req.method === 'POST' && req.url === apiUrl).flush({ id: 'nuevo' });

    httpMock.expectOne(`${apiUrl}/active`).flush([]);
  });

  it('getProfesionalesForDropdown() filtra solo los activos (undefined cuenta como activo)', () => {
    setup(true);
    const service = TestBed.inject(ProfesionalService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([
      { id: '1', activo: true },
      { id: '2', activo: false },
      { id: '3' }
    ] as Profesional[]);

    expect(service.getProfesionalesForDropdown().map(p => p.id)).toEqual(['1', '3']);
  });

  it('loggedOut$ limpia el cache', () => {
    setup(true);
    const service = TestBed.inject(ProfesionalService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([{ id: '1' }] as Profesional[]);

    auth.loggedOut$.next();

    let list: Profesional[] = [];
    service.getProfesionales().subscribe(p => (list = p));
    expect(list).toEqual([]);
  });

  it('findAllActive() pega siempre a /active, sin importar la capacidad', () => {
    setup(true);
    const service = TestBed.inject(ProfesionalService);
    auth.currentUser$.next({});
    httpMock.expectOne(apiUrl).flush([]);

    service.findAllActive().subscribe();
    httpMock.expectOne(`${apiUrl}/active`).flush([]);
  });

  describe('CRUD directo (verbo + URL)', () => {
    beforeEach(() => {
      setup(true);
      TestBed.inject(ProfesionalService);
      auth.currentUser$.next({});
      httpMock.expectOne(apiUrl).flush([]);
    });

    it('findById', () => {
      const service = TestBed.inject(ProfesionalService);
      service.findById('p1').subscribe();
      httpMock.expectOne(`${apiUrl}/p1`).flush({ id: 'p1' });
    });

    it('update dispara PATCH y luego refresca la lista', () => {
      const service = TestBed.inject(ProfesionalService);
      service.update('p1', { nombre: 'X' }).subscribe();
      httpMock.expectOne(r => r.method === 'PATCH' && r.url === `${apiUrl}/p1`).flush({ id: 'p1' });
      httpMock.expectOne(apiUrl).flush([]);
    });

    it('delete dispara DELETE y luego refresca la lista', () => {
      const service = TestBed.inject(ProfesionalService);
      service.delete('p1').subscribe();
      httpMock.expectOne(r => r.method === 'DELETE' && r.url === `${apiUrl}/p1`).flush(null);
      httpMock.expectOne(apiUrl).flush([]);
    });

    it('toggleActive hace PATCH a /:id/toggle-active y refresca', () => {
      const service = TestBed.inject(ProfesionalService);
      service.toggleActive('p1').subscribe();
      httpMock.expectOne(`${apiUrl}/p1/toggle-active`).flush(null);
      httpMock.expectOne(apiUrl).flush([]);
    });
  });
});
