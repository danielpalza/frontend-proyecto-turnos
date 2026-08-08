import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoberturasService } from './coberturas.service';
import { API_CONFIG } from '../../core/services/api.config';

const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.coberturas}`;

describe('CoberturasService', () => {
  let service: CoberturasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CoberturasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar() repite la clave "pais" por cada país (no un valor único separado por comas)', () => {
    service.listar(['AR', 'UY']).subscribe();
    const req = httpMock.expectOne(r => r.url === apiUrl);
    expect(req.request.params.getAll('pais')).toEqual(['AR', 'UY']);
    req.flush([]);
  });

  it('listarPaisesConDatos hace GET a /coberturas/paises', () => {
    service.listarPaisesConDatos().subscribe();
    httpMock.expectOne(`${apiUrl}/paises`).flush([]);
  });

  it('actualizarFavorito hace PUT con el body { favorito }', () => {
    service.actualizarFavorito('c1', true).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/c1/favorito`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ favorito: true });
    req.flush({});
  });

  it('subirArchivo manda un FormData con el file y el tipoDocumento', () => {
    const file = new File(['contenido'], 'doc.pdf', { type: 'application/pdf' });
    service.subirArchivo('c1', file, 'contrato').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/c1/archivos`);
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    expect((req.request.body as FormData).get('tipoDocumento')).toBe('contrato');
    req.flush({});
  });

  describe('descargarArchivo()', () => {
    beforeEach(() => {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
    });

    it('dispara la descarga vía un <a> temporal (createObjectURL + click + revokeObjectURL)', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      service.descargarArchivo('archivo-1', 'contrato.pdf').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/archivos/archivo-1/descarga`);
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['contenido']));

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
