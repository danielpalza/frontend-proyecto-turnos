import { TestBed } from '@angular/core/testing';
import { ErrorHandlerService } from './error-handler.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorHandlerService);
  });

  describe('getErrorMessage() sin mensaje del backend', () => {
    it('400 arma un mensaje genérico interpolando el contexto', () => {
      expect(service.getErrorMessage({ status: 400 }, 'crear el turno')).toContain('crear el turno');
    });

    it('422 arma un mensaje fijo, sin interpolar el contexto', () => {
      expect(service.getErrorMessage({ status: 422 }, 'crear el turno')).toBe(
        'Los datos no son válidos. Verifique la información ingresada.'
      );
    });

    it('401 usa el mensaje por defecto de sesión expirada', () => {
      expect(service.getErrorMessage({ status: 401 }, 'cualquier cosa')).toBe(
        'Su sesión ha expirado. Por favor, inicie sesión nuevamente.'
      );
    });

    it('403 arma "No tiene permisos para <contexto>"', () => {
      expect(service.getErrorMessage({ status: 403 }, 'eliminar el paciente')).toBe(
        'No tiene permisos para eliminar el paciente.'
      );
    });

    it('404 devuelve string vacío, no un mensaje genérico', () => {
      expect(service.getErrorMessage({ status: 404 }, 'cargar el turno')).toBe('');
    });

    it('408/500/502/503/504 devuelven mensajes fijos', () => {
      expect(service.getErrorMessage({ status: 408 }, 'x')).toContain('tardó demasiado');
      expect(service.getErrorMessage({ status: 500 }, 'x')).toContain('Error interno');
      expect(service.getErrorMessage({ status: 502 }, 'x')).toContain('no está disponible');
      expect(service.getErrorMessage({ status: 503 }, 'x')).toContain('no está disponible');
      expect(service.getErrorMessage({ status: 504 }, 'x')).toContain('tardó demasiado');
    });

    it('un status no mapeado cae al mensaje genérico con el contexto', () => {
      expect(service.getErrorMessage({ status: 418 }, 'hacer café')).toContain('hacer café');
    });
  });

  describe('getErrorMessage() con mensaje del backend', () => {
    it('extrae un string directo como error.error', () => {
      expect(service.getErrorMessage({ status: 400, error: 'Documento inválido' }, 'x')).toBe(
        'Documento inválido'
      );
    });

    it('extrae error.error.message', () => {
      expect(service.getErrorMessage({ status: 400, error: { message: 'Falta el nombre' } }, 'x')).toBe(
        'Falta el nombre'
      );
    });

    it('extrae error.error.error si es un string', () => {
      expect(service.getErrorMessage({ status: 400, error: { error: 'Bad Request' } }, 'x')).toBe(
        'Bad Request'
      );
    });

    it('une los mensajes de error.error.errors (validaciones múltiples)', () => {
      const message = service.getErrorMessage(
        { status: 400, error: { errors: { nombre: 'Requerido', email: 'Inválido' } } },
        'x'
      );
      expect(message).toBe('Requerido, Inválido');
    });
  });

  describe('getErrorMessage() 409 (conflicto)', () => {
    it('con mensaje del backend, lo devuelve tal cual sin importar el contenido', () => {
      expect(service.getErrorMessage({ status: 409, error: { message: 'El horario 10:00 está en uso' } }, 'x'))
        .toBe('El horario 10:00 está en uso');
      expect(service.getErrorMessage({ status: 409, error: { message: 'Conflicto genérico' } }, 'x'))
        .toBe('Conflicto genérico');
    });

    it('sin mensaje del backend, contexto de paciente da el mensaje de documento duplicado', () => {
      expect(service.getErrorMessage({ status: 409 }, 'crear el paciente')).toContain('Ya existe un paciente');
    });

    it('sin mensaje del backend, contexto de turno da el mensaje de horario ocupado', () => {
      expect(service.getErrorMessage({ status: 409 }, 'crear el turno')).toContain('horario seleccionado');
    });

    it('sin mensaje del backend ni contexto reconocido: genérico de conflicto', () => {
      expect(service.getErrorMessage({ status: 409 }, 'archivar la cobertura')).toContain(
        'Error de conflicto al archivar la cobertura'
      );
    });
  });

  describe('detección de error de red', () => {
    it('un error sin status, o con status 0, se trata como error de red (antes que el switch)', () => {
      expect(service.getErrorMessage(null, 'cargar el turno')).toContain('conexión');
      expect(service.getErrorMessage({ status: 0 }, 'cargar el turno')).toContain('conexión');
    });

    it('getNetworkErrorMessage tiene mensajes específicos por contexto', () => {
      expect(service.getErrorMessage({ status: 0 }, 'crear el paciente')).toContain('No se pudo crear el paciente');
      expect(service.getErrorMessage({ status: 0 }, 'crear el turno')).toContain('No se pudo crear el turno');
      expect(service.getErrorMessage({ status: 0 }, 'eliminar el turno')).toContain('No se pudo eliminar el turno');
    });

    it('isNetworkError() refleja el mismo criterio', () => {
      expect(service.isNetworkError(null)).toBe(true);
      expect(service.isNetworkError({ status: 0 })).toBe(true);
      expect(service.isNetworkError({ status: 500 })).toBe(false);
    });
  });

  describe('requiresReauth() / isForbiddenError()', () => {
    it('requiresReauth() es true solo para 401', () => {
      expect(service.requiresReauth({ status: 401 })).toBe(true);
      expect(service.requiresReauth({ status: 403 })).toBe(false);
    });

    it('isForbiddenError() es true solo para 403', () => {
      expect(service.isForbiddenError({ status: 403 })).toBe(true);
      expect(service.isForbiddenError({ status: 401 })).toBe(false);
    });
  });
});
