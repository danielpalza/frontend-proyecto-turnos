import { render } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CoberturasViewComponent } from './coberturas-view.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { CoberturasService } from '../coberturas.service';
import { IntermediariosService } from '../intermediarios.service';
import { Cobertura, Intermediario } from '../coberturas.models';

function cobertura(overrides: Partial<Cobertura> = {}): Cobertura {
  return {
    id: 'c1', pais: 'AR', nombre: 'OSDE', sigla: 'OSDE', favorito: false,
    notasPropias: '', webPropia: '', telefonoPropio: '', documentos: [],
    ...overrides
  } as unknown as Cobertura;
}

function intermediario(overrides: Partial<Intermediario> = {}): Intermediario {
  return {
    id: 'i1', pais: 'AR', nombre: 'Grupo X', coberturaIds: [], documentos: [],
    ...overrides
  } as unknown as Intermediario;
}

function makeMocks(overrides: { organizationId?: string; organizationPais?: string } = {}) {
  return {
    authService: {
      getCurrentUser: vi.fn(() => ({
        organizationId: overrides.organizationId ?? 'org1',
        organizationPais: overrides.organizationPais ?? 'AR'
      })),
      hasCapability: vi.fn(() => true),
      currentUser$: of({})
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: { getErrorMessage: vi.fn((_e: unknown, ctx: string) => `Error al ${ctx}`) },
    coberturasService: {
      listar: vi.fn(() => of([] as Cobertura[])),
      listarPaisesConDatos: vi.fn(() => of(['AR'] as string[])),
      actualizarFavorito: vi.fn(() => of(cobertura())),
      actualizarNota: vi.fn((id: string, nota: string) => of(cobertura({ id, notasPropias: nota }))),
      actualizarWeb: vi.fn((id: string, web: string) => of(cobertura({ id, webPropia: web }))),
      actualizarTelefono: vi.fn((id: string, telefono: string) => of(cobertura({ id, telefonoPropio: telefono }))),
      subirArchivo: vi.fn(() => of({ id: 'doc1', nombre: 'a.pdf' } as never)),
      descargarArchivo: vi.fn(() => of(new Blob())),
      eliminarArchivo: vi.fn(() => of(void 0))
    },
    intermediariosService: {
      listar: vi.fn(() => of([] as Intermediario[])),
      crear: vi.fn((req: unknown) => of(intermediario({ ...(req as object), id: 'i-new' } as Partial<Intermediario>))),
      actualizar: vi.fn((id: string, req: unknown) => of(intermediario({ ...(req as object), id } as Partial<Intermediario>))),
      eliminar: vi.fn(() => of(void 0)),
      subirArchivo: vi.fn(() => of({ id: 'doc1', nombre: 'a.pdf' } as never)),
      descargarArchivo: vi.fn(() => of(new Blob())),
      eliminarArchivo: vi.fn(() => of(void 0))
    }
  };
}

async function renderView(mocks: ReturnType<typeof makeMocks>) {
  return render(CoberturasViewComponent, {
    providers: [
      { provide: AuthService, useValue: mocks.authService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler },
      { provide: CoberturasService, useValue: mocks.coberturasService },
      { provide: IntermediariosService, useValue: mocks.intermediariosService }
    ]
  });
}

describe('CoberturasViewComponent', () => {
  const STORAGE_KEY = 'coberturas.paisesActivos.org1';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('países activos guardados en localStorage', () => {
    it('sin nada guardado, arranca con el país de la organización como único activo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.paisesActivos()).toEqual(new Set(['AR']));
    });

    it('con países guardados válidos, los restaura', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['AR', 'UY']));
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.paisesActivos()).toEqual(new Set(['AR', 'UY']));
    });

    it('con JSON corrupto, cae en silencio al país de la organización', async () => {
      localStorage.setItem(STORAGE_KEY, '{esto no es json');
      const mocks = makeMocks();

      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.paisesActivos()).toEqual(new Set(['AR']));
    });

    it('togglePais persiste el nuevo set en localStorage', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.togglePais('UY');

      expect(fixture.componentInstance.paisesActivos()).toEqual(new Set(['AR', 'UY']));
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).sort()).toEqual(['AR', 'UY']);

      fixture.componentInstance.togglePais('UY');
      expect(fixture.componentInstance.paisesActivos()).toEqual(new Set(['AR']));
    });
  });

  describe('toggleFavorito: update optimista + descarte de respuestas fuera de orden', () => {
    it('togglear dos veces rápido y que responda primero la request vieja no pisa el estado más reciente', async () => {
      const mocks = makeMocks();
      const responses: Subject<Cobertura>[] = [new Subject(), new Subject()];
      let call = 0;
      mocks.coberturasService.actualizarFavorito.mockImplementation(() => responses[call++]);
      const os = cobertura({ id: 'c1', favorito: false });
      mocks.coberturasService.listar.mockReturnValue(of([os]));
      const { fixture } = await renderView(mocks);

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      fixture.componentInstance.toggleFavorito(os, event);
      const current = fixture.componentInstance.coberturas().find(o => o.id === 'c1')!;
      fixture.componentInstance.toggleFavorito(current, event);

      expect(fixture.componentInstance.coberturas()[0].favorito).toBe(false);

      responses[0].error(new HttpErrorResponse({ status: 500 }));

      expect(fixture.componentInstance.coberturas()[0].favorito).toBe(false);
      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });

    it('sin toggles concurrentes, un error revierte el estado optimista y avisa', async () => {
      const mocks = makeMocks();
      mocks.coberturasService.actualizarFavorito.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      const os = cobertura({ id: 'c1', favorito: false });
      mocks.coberturasService.listar.mockReturnValue(of([os]));
      const { fixture } = await renderView(mocks);

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      fixture.componentInstance.toggleFavorito(fixture.componentInstance.coberturas()[0], event);

      expect(fixture.componentInstance.coberturas()[0].favorito).toBe(false);
      expect(mocks.notification.showError).toHaveBeenCalled();
    });
  });

  describe('guardarNota (patrón compartido con guardarWeb/guardarTelefono)', () => {
    it('guarda la nota editada y limpia el estado de edición', async () => {
      const os = cobertura({ id: 'c1', notasPropias: 'vieja' });
      const mocks = makeMocks();
      mocks.coberturasService.listar.mockReturnValue(of([os]));
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.onNotaChange('c1', 'nueva');

      fixture.componentInstance.guardarNota(fixture.componentInstance.coberturas()[0]);

      expect(mocks.coberturasService.actualizarNota).toHaveBeenCalledWith('c1', 'nueva');
      expect(fixture.componentInstance.notaSinGuardar(fixture.componentInstance.coberturas()[0])).toBe(false);
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Nota guardada.');
    });

    it('evita doble submit mientras hay un guardado en vuelo', async () => {
      const os = cobertura({ id: 'c1' });
      const mocks = makeMocks();
      mocks.coberturasService.listar.mockReturnValue(of([os]));
      mocks.coberturasService.actualizarNota.mockReturnValue(new Subject());
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.guardarNota(fixture.componentInstance.coberturas()[0]);
      fixture.componentInstance.guardarNota(fixture.componentInstance.coberturas()[0]);

      expect(mocks.coberturasService.actualizarNota).toHaveBeenCalledTimes(1);
    });
  });

  it('guardarWeb guarda el valor editado (mismo patrón que guardarNota)', async () => {
    const os = cobertura({ id: 'c1' });
    const mocks = makeMocks();
    mocks.coberturasService.listar.mockReturnValue(of([os]));
    const { fixture } = await renderView(mocks);
    fixture.componentInstance.onWebChange('c1', 'https://osde.com.ar');

    fixture.componentInstance.guardarWeb(fixture.componentInstance.coberturas()[0]);

    expect(mocks.coberturasService.actualizarWeb).toHaveBeenCalledWith('c1', 'https://osde.com.ar');
    expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Web guardada.');
  });

  it('guardarTelefono guarda el valor editado (mismo patrón que guardarNota)', async () => {
    const os = cobertura({ id: 'c1' });
    const mocks = makeMocks();
    mocks.coberturasService.listar.mockReturnValue(of([os]));
    const { fixture } = await renderView(mocks);
    fixture.componentInstance.onTelefonoChange('c1', '011-4444-5555');

    fixture.componentInstance.guardarTelefono(fixture.componentInstance.coberturas()[0]);

    expect(mocks.coberturasService.actualizarTelefono).toHaveBeenCalledWith('c1', '011-4444-5555');
    expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Teléfono guardado.');
  });

  describe('validación de archivos (duplicada entre cobertura e intermediario)', () => {
    function fileOf(name: string, sizeBytes: number): File {
      const file = new File(['x'.repeat(Math.min(sizeBytes, 10))], name);
      Object.defineProperty(file, 'size', { value: sizeBytes });
      return file;
    }

    it('cobertura: extensión no permitida rechaza sin llamar al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const files = [fileOf('archivo.exe', 1000)] as unknown as FileList;

      fixture.componentInstance.onSubirDocumento(cobertura(), files, 'DNI');

      expect(mocks.notification.showError).toHaveBeenCalledWith('Solo se aceptan archivos .pdf, .docx o .doc');
      expect(mocks.coberturasService.subirArchivo).not.toHaveBeenCalled();
    });

    it('cobertura: archivo de más de 20MB rechaza sin llamar al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const files = [fileOf('archivo.pdf', 21 * 1024 * 1024)] as unknown as FileList;

      fixture.componentInstance.onSubirDocumento(cobertura(), files, 'DNI');

      expect(mocks.notification.showError).toHaveBeenCalledWith('El archivo supera el tamaño máximo permitido de 20MB');
      expect(mocks.coberturasService.subirArchivo).not.toHaveBeenCalled();
    });

    it('intermediario: mismas dos validaciones (extensión y tamaño)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onSubirDocumentoIntermediario(intermediario(), [fileOf('a.exe', 100)] as unknown as FileList, '');
      expect(mocks.intermediariosService.subirArchivo).not.toHaveBeenCalled();

      fixture.componentInstance.onSubirDocumentoIntermediario(intermediario(), [fileOf('a.pdf', 30 * 1024 * 1024)] as unknown as FileList, '');
      expect(mocks.intermediariosService.subirArchivo).not.toHaveBeenCalled();
    });

    it('cobertura: archivo válido se sube y se agrega a la lista de documentos', async () => {
      const os = cobertura({ id: 'c1', documentos: [] });
      const mocks = makeMocks();
      mocks.coberturasService.listar.mockReturnValue(of([os]));
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onSubirDocumento(fixture.componentInstance.coberturas()[0], [fileOf('a.pdf', 100)] as unknown as FileList, 'DNI');

      expect(fixture.componentInstance.coberturas()[0].documentos).toHaveLength(1);
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Archivo subido correctamente.');
    });
  });

  describe('onEliminarDocumento usa confirm() nativo', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('confirm() = false: no llama al servicio', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onEliminarDocumento(cobertura(), 'doc1');

      expect(mocks.coberturasService.eliminarArchivo).not.toHaveBeenCalled();
    });

    it('confirm() = true: elimina y saca el documento de la lista', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const os = cobertura({ id: 'c1', documentos: [{ id: 'doc1', nombre: 'a.pdf' } as never] });
      const mocks = makeMocks();
      mocks.coberturasService.listar.mockReturnValue(of([os]));
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onEliminarDocumento(fixture.componentInstance.coberturas()[0], 'doc1');

      expect(mocks.coberturasService.eliminarArchivo).toHaveBeenCalledWith('doc1');
      expect(fixture.componentInstance.coberturas()[0].documentos).toHaveLength(0);
    });
  });

  describe('signals computados: filtrado por país activo + búsqueda', () => {
    it('visibles/favoritas/resto respetan país activo y término de búsqueda', async () => {
      const coberturas = [
        cobertura({ id: 'c1', pais: 'AR', nombre: 'OSDE', favorito: true }),
        cobertura({ id: 'c2', pais: 'AR', nombre: 'Swiss Medical', favorito: false }),
        cobertura({ id: 'c3', pais: 'UY', nombre: 'Mapfre', favorito: false })
      ];
      const mocks = makeMocks();
      mocks.coberturasService.listar.mockReturnValue(of(coberturas));
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance['visibles']().map((o: Cobertura) => o.id)).toEqual(['c1', 'c2']);
      expect(fixture.componentInstance.favoritas().map(o => o.id)).toEqual(['c1']);
      expect(fixture.componentInstance.resto().map(o => o.id)).toEqual(['c2']);

      fixture.componentInstance.onBuscar('swiss');
      expect(fixture.componentInstance.resto().map(o => o.id)).toEqual(['c2']);
      expect(fixture.componentInstance.favoritas()).toEqual([]);
    });
  });

  describe('modal de intermediarios', () => {
    it('abrirModal resetea el form al país de la organización', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.abrirModal();

      expect(fixture.componentInstance.modalAbierto()).toBe(true);
      expect(fixture.componentInstance.intermediarioEditandoId()).toBeNull();
      expect(fixture.componentInstance.form.value.pais).toBe('AR');
    });

    it('abrirModalEdicion precarga los datos del intermediario', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const i = intermediario({ id: 'i1', nombre: 'Grupo X', pais: 'UY', coberturaIds: ['c1'] });
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      fixture.componentInstance.abrirModalEdicion(i, event);

      expect(fixture.componentInstance.intermediarioEditandoId()).toBe('i1');
      expect(fixture.componentInstance.form.value.nombre).toBe('Grupo X');
      expect(fixture.componentInstance.form.value.coberturaIds).toEqual(['c1']);
    });

    it('guardarIntermediario con form inválido marca todo como touched y no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.abrirModal();
      fixture.componentInstance.form.patchValue({ nombre: '' });

      fixture.componentInstance.guardarIntermediario();

      expect(mocks.intermediariosService.crear).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.get('nombre')!.touched).toBe(true);
    });

    it('crear un intermediario nuevo activa automáticamente el país elegido', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.abrirModal();
      fixture.componentInstance.form.patchValue({ nombre: 'Grupo Nuevo', pais: 'UY' });

      fixture.componentInstance.guardarIntermediario();

      expect(mocks.intermediariosService.crear).toHaveBeenCalled();
      expect(fixture.componentInstance.paisesActivos().has('UY')).toBe(true);
      expect(fixture.componentInstance.modalAbierto()).toBe(false);
    });

    it('actualizar un intermediario existente no reactiva ningún país nuevo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const i = intermediario({ id: 'i1', pais: 'AR' });
      fixture.componentInstance.abrirModalEdicion(i, { stopPropagation: vi.fn() } as unknown as Event);
      fixture.componentInstance.form.patchValue({ nombre: 'Grupo X editado' });

      fixture.componentInstance.guardarIntermediario();

      expect(mocks.intermediariosService.actualizar).toHaveBeenCalledWith('i1', expect.objectContaining({ nombre: 'Grupo X editado' }));
    });
  });

  describe('eliminación de intermediario', () => {
    it('cerrarConfirmEliminar es no-op mientras se está eliminando', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.eliminarIntermediario(intermediario(), { stopPropagation: vi.fn() } as unknown as Event);
      fixture.componentInstance.eliminandoIntermediario.set(true);

      fixture.componentInstance.cerrarConfirmEliminar();

      expect(fixture.componentInstance.confirmEliminarAbierto()).toBe(true);
    });

    it('confirmarEliminarIntermediario elimina, cierra el diálogo y avisa', async () => {
      const i = intermediario({ id: 'i1' });
      const mocks = makeMocks();
      mocks.intermediariosService.listar.mockReturnValue(of([i]));
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.eliminarIntermediario(fixture.componentInstance.intermediarios()[0], { stopPropagation: vi.fn() } as unknown as Event);

      fixture.componentInstance.confirmarEliminarIntermediario();

      expect(mocks.intermediariosService.eliminar).toHaveBeenCalledWith('i1');
      expect(fixture.componentInstance.intermediarios()).toEqual([]);
      expect(fixture.componentInstance.confirmEliminarAbierto()).toBe(false);
    });
  });

  it('nombresCoberturasDe arma la lista separada por comas usando sigla o nombre', async () => {
    const coberturas = [
      cobertura({ id: 'c1', nombre: 'OSDE', sigla: 'OSDE' }),
      cobertura({ id: 'c2', nombre: 'Swiss Medical', sigla: undefined })
    ];
    const mocks = makeMocks();
    mocks.coberturasService.listar.mockReturnValue(of(coberturas));
    const { fixture } = await renderView(mocks);
    const i = intermediario({ coberturaIds: ['c1', 'c2'] });

    expect(fixture.componentInstance.nombresCoberturasDe(i)).toBe('OSDE, Swiss Medical');
  });
});
