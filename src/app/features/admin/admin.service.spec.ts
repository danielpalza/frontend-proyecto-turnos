import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { API_CONFIG } from '../../core/services/api.config';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin}`;

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('cobranza', () => {
    it('listarPagos hace GET a /pagos', () => {
      service.listarPagos().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/pagos`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('listarPagosDeOrganizacion hace GET a /organizations/{orgId}/pagos', () => {
      service.listarPagosDeOrganizacion('org-1').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations/org-1/pagos`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('confirmarPago hace PUT a /organizations/{orgId}/pagos/{periodoPagoId}/confirmar con body vacío', () => {
      service.confirmarPago('org-1', 'pago-1').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations/org-1/pagos/pago-1/confirmar`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({});
    });
  });

  describe('organizaciones y usuarios', () => {
    it('listarOrganizaciones hace GET a /organizations', () => {
      service.listarOrganizaciones().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('obtenerOrganizacion hace GET a /organizations/{orgId}', () => {
      service.obtenerOrganizacion('org-1').subscribe();
      httpMock.expectOne(`${apiUrl}/organizations/org-1`).flush({});
    });

    it('toggleOrganizacionActiva hace PATCH con body vacío', () => {
      service.toggleOrganizacionActiva('org-1').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations/org-1/toggle-active`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    it('actualizarPlan hace PUT con el body { plan }', () => {
      service.actualizarPlan('org-1', 'MEDIO' as any).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations/org-1/plan`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ plan: 'MEDIO' });
      req.flush({});
    });

    it('actualizarModulos hace PUT con el body { moduleCodes }', () => {
      service.actualizarModulos('org-1', ['TURNOS', 'COBERTURA']).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations/org-1/modules`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ moduleCodes: ['TURNOS', 'COBERTURA'] });
      req.flush({});
    });

    it('listarUsuarios hace GET a /organizations/{orgId}/users', () => {
      service.listarUsuarios('org-1').subscribe();
      httpMock.expectOne(`${apiUrl}/organizations/org-1/users`).flush([]);
    });

    it('toggleUsuarioActivo hace PATCH con body vacío', () => {
      service.toggleUsuarioActivo('org-1', 'user-1').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations/org-1/users/user-1/toggle-active`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    it('actualizarRolUsuario hace PUT con el body { role }', () => {
      service.actualizarRolUsuario('org-1', 'user-1', 'ADMIN').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/organizations/org-1/users/user-1/role`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ role: 'ADMIN' });
      req.flush({});
    });
  });
});
