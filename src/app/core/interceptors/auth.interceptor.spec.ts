import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { API_CONFIG } from '../services/api.config';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { getToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { getToken: vi.fn(() => 'fake-token') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService }
      ]
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('agrega el header Authorization cuando hay token y la URL no es de /auth/', () => {
    httpClient.get('/api/patients').subscribe();
    const req = httpMock.expectOne('/api/patients');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-token');
    req.flush({});
  });

  it('no agrega el header en endpoints de /auth/', () => {
    const authUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}/login`;
    httpClient.post(authUrl, {}).subscribe();
    const req = httpMock.expectOne(authUrl);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no agrega el header si no hay token', () => {
    authService.getToken.mockReturnValue(null);
    httpClient.get('/api/patients').subscribe();
    const req = httpMock.expectOne('/api/patients');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
