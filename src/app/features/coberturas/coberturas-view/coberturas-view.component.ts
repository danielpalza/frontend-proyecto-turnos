import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { CoberturasService } from '../coberturas.service';
import { IntermediariosService } from '../intermediarios.service';
import {
  Intermediario,
  IntermediarioRequest,
  NOMBRES_PAIS,
  Cobertura,
  Pais,
  TIPOS_DOCUMENTO,
  TIPO_LINK_LABELS
} from '../coberturas.models';

const EXTENSIONES_PERMITIDAS = ['pdf', 'docx', 'doc'];
const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024;

@Component({
  selector: 'app-coberturas-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './coberturas-view.component.html',
  styleUrl: './coberturas-view.component.scss'
})
export class CoberturasViewComponent implements OnInit {
  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly tipoLinkLabels = TIPO_LINK_LABELS;

  private readonly currentUser = inject(AuthService).getCurrentUser();
  private readonly paisOrganizacion = this.currentUser?.organizationPais || 'AR';
  private readonly paisesActivosStorageKey = `coberturas.paisesActivos.${this.currentUser?.organizationId ?? 'sin-organizacion'}`;

  /** Países que tienen datos reales cargados en el catálogo (viene de GET /coberturas/paises). */
  readonly paisesConDatos = signal<string[]>([]);
  readonly paisesActivos = signal<Set<string>>(this.cargarPaisesActivosGuardados());
  readonly cargando = signal(false);

  readonly coberturas = signal<Cobertura[]>([]);
  readonly intermediarios = signal<Intermediario[]>([]);

  readonly busqueda = signal('');
  readonly cardAbierta = signal<string | null>(null);
  readonly notaEnEdicion = signal<Record<string, string>>({});
  readonly webEnEdicion = signal<Record<string, string>>({});
  readonly telefonoEnEdicion = signal<Record<string, string>>({});

  readonly modalAbierto = signal(false);
  readonly intermediarioEditandoId = signal<string | null>(null);
  readonly modalPaisSeleccionado = signal(this.paisOrganizacion);
  readonly busquedaModal = signal('');

  private readonly visibles = computed(() => {
    const paises = this.paisesActivos();
    const q = this.busqueda().trim().toLowerCase();
    return this.coberturas().filter(
      o =>
        paises.has(o.pais) &&
        ((o.sigla ?? '').toLowerCase().includes(q) || o.nombre.toLowerCase().includes(q))
    );
  });

  readonly favoritas = computed(() => this.visibles().filter(o => o.favorito));
  readonly resto = computed(() => this.visibles().filter(o => !o.favorito));

  readonly intermediariosVisibles = computed(() => {
    const paises = this.paisesActivos();
    const q = this.busqueda().trim().toLowerCase();
    return this.intermediarios().filter(
      i => paises.has(i.pais) && (!q || i.nombre.toLowerCase().includes(q))
    );
  });

  readonly coberturasDelPaisModal = computed(() => {
    const q = this.busquedaModal().trim().toLowerCase();
    return this.coberturas().filter(o =>
      o.pais === this.modalPaisSeleccionado() &&
      (!q || (o.sigla ?? '').toLowerCase().includes(q) || o.nombre.toLowerCase().includes(q))
    );
  });

  /** Chips activos (los que el usuario tildó), con nombre para mostrar. */
  readonly chipsActivos = computed(() =>
    [...this.paisesActivos()].map(codigo => this.paisComoObjeto(codigo))
  );

  /** Países con datos que todavía no están activos — alimentan el "+ Agregar país". */
  readonly paisesParaAgregar = computed(() =>
    this.paisesConDatos()
      .filter(codigo => !this.paisesActivos().has(codigo))
      .map(codigo => this.paisComoObjeto(codigo))
  );

  /** Países disponibles para el selector del modal de intermediario (solo los que tienen catálogo). */
  readonly paisesModal = computed(() => this.paisesConDatos().map(codigo => this.paisComoObjeto(codigo)));

  readonly form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private coberturasService: CoberturasService,
    private intermediariosService: IntermediariosService
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      pais: [this.paisOrganizacion, Validators.required],
      telefono: [''],
      web: [''],
      notas: [''],
      coberturaIds: this.fb.control<string[]>([])
    });

    this.form.get('pais')!.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(pais => this.modalPaisSeleccionado.set(pais));
  }

  ngOnInit(): void {
    this.cargarCoberturas();
    this.cargarIntermediarios();
    this.cargarPaisesConDatos();
  }

  private cargarPaisesConDatos(): void {
    this.coberturasService.listarPaisesConDatos().subscribe({
      next: paises => this.paisesConDatos.set(paises),
      error: () => {
        // Si falla, al menos dejamos el país de la organización como única opción conocida.
        this.paisesConDatos.set([this.paisOrganizacion]);
      }
    });
  }

  private paisComoObjeto(codigo: string): Pais {
    return NOMBRES_PAIS.find(p => p.codigo === codigo) ?? { codigo, nombre: codigo };
  }

  private cargarCoberturas(): void {
    this.cargando.set(true);
    this.coberturasService.listar([]).subscribe({
      next: lista => {
        this.coberturas.set(lista);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'cargar las coberturas'));
      }
    });
  }

  private cargarIntermediarios(): void {
    this.intermediariosService.listar().subscribe({
      next: lista => this.intermediarios.set(lista),
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'cargar las agrupaciones'));
      }
    });
  }

  togglePais(codigo: string): void {
    const actuales = new Set(this.paisesActivos());
    actuales.has(codigo) ? actuales.delete(codigo) : actuales.add(codigo);
    this.paisesActivos.set(actuales);
    this.guardarPaisesActivos(actuales);
  }

  private activarPais(codigo: string): void {
    if (this.paisesActivos().has(codigo)) return;
    const actuales = new Set(this.paisesActivos()).add(codigo);
    this.paisesActivos.set(actuales);
    this.guardarPaisesActivos(actuales);
  }

  private cargarPaisesActivosGuardados(): Set<string> {
    try {
      const guardado = localStorage.getItem(this.paisesActivosStorageKey);
      const paises: unknown = guardado ? JSON.parse(guardado) : null;
      if (Array.isArray(paises) && paises.length > 0) {
        return new Set(paises);
      }
    } catch {
      // localStorage corrupto o inaccesible (modo privado, etc.): seguimos con el default.
    }
    return new Set([this.paisOrganizacion]);
  }

  private guardarPaisesActivos(paises: Set<string>): void {
    try {
      localStorage.setItem(this.paisesActivosStorageKey, JSON.stringify([...paises]));
    } catch {
      // Si falla (modo privado, cuota excedida), no persistimos pero no rompemos la UI.
    }
  }

  onBuscar(valor: string): void {
    this.busqueda.set(valor);
  }

  onBuscarModal(valor: string): void {
    this.busquedaModal.set(valor);
  }

  toggleCard(id: string): void {
    this.cardAbierta.set(this.cardAbierta() === id ? null : id);
  }

  toggleFavorito(os: Cobertura, event: Event): void {
    event.stopPropagation();
    const nuevoValor = !os.favorito;
    this.coberturas.update(lista => lista.map(o => (o.id === os.id ? { ...o, favorito: nuevoValor } : o)));
    this.coberturasService.actualizarFavorito(os.id, nuevoValor).subscribe({
      error: (err: HttpErrorResponse) => {
        this.coberturas.update(lista => lista.map(o => (o.id === os.id ? { ...o, favorito: !nuevoValor } : o)));
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'actualizar el favorito'));
      }
    });
  }

  notaValor(os: Cobertura): string {
    return this.notaEnEdicion()[os.id] ?? os.notasPropias ?? '';
  }

  notaSinGuardar(os: Cobertura): boolean {
    return os.id in this.notaEnEdicion();
  }

  onNotaChange(coberturaId: string, valor: string): void {
    this.notaEnEdicion.update(actual => ({ ...actual, [coberturaId]: valor }));
  }

  guardarNota(os: Cobertura): void {
    const nota = this.notaValor(os);
    this.coberturasService.actualizarNota(os.id, nota).subscribe({
      next: actualizada => {
        this.coberturas.update(lista => lista.map(o => (o.id === os.id ? actualizada : o)));
        this.notaEnEdicion.update(actual => {
          const { [os.id]: _quitada, ...resto } = actual;
          return resto;
        });
        this.notification.showSuccess('Nota guardada.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'guardar la nota'));
      }
    });
  }

  webValor(os: Cobertura): string {
    return this.webEnEdicion()[os.id] ?? os.webPropia ?? '';
  }

  webSinGuardar(os: Cobertura): boolean {
    return os.id in this.webEnEdicion();
  }

  onWebChange(coberturaId: string, valor: string): void {
    this.webEnEdicion.update(actual => ({ ...actual, [coberturaId]: valor }));
  }

  guardarWeb(os: Cobertura): void {
    const web = this.webValor(os);
    this.coberturasService.actualizarWeb(os.id, web).subscribe({
      next: actualizada => {
        this.coberturas.update(lista => lista.map(o => (o.id === os.id ? actualizada : o)));
        this.webEnEdicion.update(actual => {
          const { [os.id]: _quitada, ...resto } = actual;
          return resto;
        });
        this.notification.showSuccess('Web guardada.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'guardar la web'));
      }
    });
  }

  telefonoValor(os: Cobertura): string {
    return this.telefonoEnEdicion()[os.id] ?? os.telefonoPropio ?? '';
  }

  telefonoSinGuardar(os: Cobertura): boolean {
    return os.id in this.telefonoEnEdicion();
  }

  onTelefonoChange(coberturaId: string, valor: string): void {
    this.telefonoEnEdicion.update(actual => ({ ...actual, [coberturaId]: valor }));
  }

  guardarTelefono(os: Cobertura): void {
    const telefono = this.telefonoValor(os);
    this.coberturasService.actualizarTelefono(os.id, telefono).subscribe({
      next: actualizada => {
        this.coberturas.update(lista => lista.map(o => (o.id === os.id ? actualizada : o)));
        this.telefonoEnEdicion.update(actual => {
          const { [os.id]: _quitada, ...resto } = actual;
          return resto;
        });
        this.notification.showSuccess('Teléfono guardado.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'guardar el teléfono'));
      }
    });
  }

  onSubirDocumento(os: Cobertura, files: FileList | null, tipoDocumento: string): void {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !EXTENSIONES_PERMITIDAS.includes(ext)) {
      this.notification.showError('Solo se aceptan archivos .pdf, .docx o .doc');
      return;
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
      this.notification.showError('El archivo supera el tamaño máximo permitido de 20MB');
      return;
    }

    this.coberturasService.subirArchivo(os.id, file, tipoDocumento || undefined).subscribe({
      next: documento => {
        this.coberturas.update(lista =>
          lista.map(o => (o.id === os.id ? { ...o, documentos: [...o.documentos, documento] } : o))
        );
        this.notification.showSuccess('Archivo subido correctamente.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'subir el archivo'));
      }
    });
  }

  onDescargarDocumento(archivoId: string, nombreArchivo: string): void {
    this.coberturasService.descargarArchivo(archivoId, nombreArchivo).subscribe({
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'descargar el archivo'));
      }
    });
  }

  onEliminarDocumento(os: Cobertura, archivoId: string): void {
    if (!confirm('¿Eliminar este archivo?')) return;
    this.coberturasService.eliminarArchivo(archivoId).subscribe({
      next: () => {
        this.coberturas.update(lista =>
          lista.map(o =>
            o.id === os.id ? { ...o, documentos: o.documentos.filter(d => d.id !== archivoId) } : o
          )
        );
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'eliminar el archivo'));
      }
    });
  }

  // --- Modal de intermediarios (crear/editar) ---

  abrirModal(): void {
    this.intermediarioEditandoId.set(null);
    this.modalPaisSeleccionado.set(this.paisOrganizacion);
    this.busquedaModal.set('');
    this.form.reset({ nombre: '', pais: this.paisOrganizacion, telefono: '', web: '', notas: '', coberturaIds: [] });
    this.modalAbierto.set(true);
  }

  abrirModalEdicion(intermediario: Intermediario, event: Event): void {
    event.stopPropagation();
    this.intermediarioEditandoId.set(intermediario.id);
    this.modalPaisSeleccionado.set(intermediario.pais);
    this.busquedaModal.set('');
    this.form.reset({
      nombre: intermediario.nombre,
      pais: intermediario.pais,
      telefono: intermediario.telefono ?? '',
      web: intermediario.web ?? '',
      notas: intermediario.notas ?? '',
      coberturaIds: [...intermediario.coberturaIds]
    });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  toggleCoberturaEnForm(id: string, checked: boolean): void {
    const actuales: string[] = this.form.value.coberturaIds ?? [];
    const nuevos = checked ? [...actuales, id] : actuales.filter(x => x !== id);
    this.form.patchValue({ coberturaIds: nuevos });
  }

  guardarIntermediario(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const request: IntermediarioRequest = {
      nombre: v.nombre,
      pais: v.pais,
      telefono: v.telefono || undefined,
      web: v.web || undefined,
      notas: v.notas || undefined,
      coberturaIds: v.coberturaIds ?? []
    };

    const editandoId = this.intermediarioEditandoId();
    const accion$ = editandoId
      ? this.intermediariosService.actualizar(editandoId, request)
      : this.intermediariosService.crear(request);

    accion$.subscribe({
      next: resultado => {
        this.intermediarios.update(lista =>
          editandoId ? lista.map(i => (i.id === editandoId ? resultado : i)) : [...lista, resultado]
        );
        if (!editandoId) {
          this.activarPais(resultado.pais);
        }
        this.notification.showSuccess(editandoId ? 'Agrupación actualizada.' : 'Agrupación creada.');
        this.cerrarModal();
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'guardar la agrupación'));
      }
    });
  }

  eliminarIntermediario(intermediario: Intermediario, event: Event): void {
    event.stopPropagation();
    if (!confirm(`¿Eliminar "${intermediario.nombre}"?`)) return;

    this.intermediariosService.eliminar(intermediario.id).subscribe({
      next: () => {
        this.intermediarios.update(lista => lista.filter(i => i.id !== intermediario.id));
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'eliminar la agrupación'));
      }
    });
  }

  nombresCoberturasDe(intermediario: Intermediario): string {
    return this.coberturas()
      .filter(o => intermediario.coberturaIds.includes(o.id))
      .map(o => o.sigla ?? o.nombre)
      .join(', ');
  }
}
