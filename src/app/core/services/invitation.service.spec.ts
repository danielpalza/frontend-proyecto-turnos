import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvitationService } from './invitation.service';
import { API_CONFIG } from './api.config';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.invitations}`;

describe('InvitationService', () => {
  let service: InvitationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InvitationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create hace POST a /invitations', () => {
    service.create({ moduleCodes: ['TURNOS'] }).subscribe();
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('findAll hace GET a /invitations', () => {
    service.findAll().subscribe();
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('revoke hace DELETE a /invitations/:id', () => {
    service.revoke('inv-1').subscribe();
    const req = httpMock.expectOne(`${apiUrl}/inv-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
