import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IntermediariosService } from './intermediarios.service';
import { API_CONFIG } from '../../core/services/api.config';
import { IntermediarioRequest } from './coberturas.models';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.intermediarios}`;

function request(overrides: Partial<IntermediarioRequest> = {}): IntermediarioRequest {
  return { nombre: 'Institución X', pais: 'AR', coberturaIds: [], ...overrides };
}

describe('IntermediariosService', () => {
  let service: IntermediariosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(IntermediariosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar hace GET a /intermediarios', () => {
    service.listar().subscribe();
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crear hace POST con el request', () => {
    service.crear(request()).subscribe();
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request());
    req.flush({});
  });

  it('actualizar hace PUT a /intermediarios/:id', () => {
    service.actualizar('i1', request()).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/i1`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('eliminar hace DELETE a /intermediarios/:id', () => {
    service.eliminar('i1').subscribe();
    const req = httpMock.expectOne(`${apiUrl}/i1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('subirArchivo manda un FormData', () => {
    const file = new File(['x'], 'doc.pdf');
    service.subirArchivo('i1', file).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/i1/archivos`);
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({});
  });

  describe('descargarArchivo()', () => {
    beforeEach(() => {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
    });

    it('dispara la descarga vía un <a> temporal', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      service.descargarArchivo('archivo-1', 'doc.pdf').subscribe();
      httpMock.expectOne(`${apiUrl}/archivos/archivo-1/descarga`).flush(new Blob(['x']));

      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
