import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CanDirective } from '../../directives/can.directive';
import { ScrollLockDirective } from '../../directives/scroll-lock.directive';
import { BodyPortalDirective } from '../../directives/body-portal.directive';
import { Capability } from '../../../core/auth/capabilities';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { DocumentosService } from '../../services/documentos.service';
import { DocumentoAdjunto, TipoEntidadDocumento, TIPOS_DOCUMENTO_GENERICO } from '../../../core/models/documento.model';

const EXTENSIONES_PERMITIDAS = ['pdf', 'docx', 'doc'];
const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024;

/**
 * Modal compartido de documentos adjuntos — turno, paciente o profesional (ver
 * bakend-proyecto-turnos/docs/DESARROLLOS_FUTUROS.md § 4). Mismo patrón de subida/descarga/borrado
 * que el módulo de Coberturas (`CoberturasService`), pero parametrizado por tipo de entidad.
 */
@Component({
  selector: 'app-documentos-modal',
  standalone: true,
  imports: [CommonModule, CanDirective, ScrollLockDirective, BodyPortalDirective],
  templateUrl: './documentos-modal.component.html',
  styleUrl: './documentos-modal.component.scss'
})
export class DocumentosModalComponent implements OnChanges {
  @Input() open = false;
  @Input() tipoEntidad: TipoEntidadDocumento | null = null;
  @Input() entidadId: string | null = null;
  @Input() titulo = 'Documentos';
  @Output() closed = new EventEmitter<void>();

  readonly Capability = Capability;
  readonly tiposDocumento = TIPOS_DOCUMENTO_GENERICO;

  documentos: DocumentoAdjunto[] = [];
  cargando = false;

  constructor(
    private documentosService: DocumentosService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService
  ) {}

  /** PROFESIONAL gestiona con PROFESIONALES:MANAGE; turno/paciente con SEGUIMIENTO:PACIENTES. */
  get capabilityManage(): Capability {
    return this.tipoEntidad === 'PROFESIONAL' ? Capability.PROFESIONALES_MANAGE : Capability.SEGUIMIENTO_PACIENTES;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.tipoEntidad && this.entidadId) {
      this.cargarDocumentos();
    }
  }

  onSubir(files: FileList | null, tipoDocumento: string): void {
    if (!files || files.length === 0 || !this.tipoEntidad || !this.entidadId) return;
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

    this.documentosService.subir(this.tipoEntidad, this.entidadId, file, tipoDocumento || undefined).subscribe({
      next: documento => {
        this.documentos = [...this.documentos, documento];
        this.notification.showSuccess('Documento subido correctamente.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'subir el documento'));
      }
    });
  }

  onDescargar(documento: DocumentoAdjunto): void {
    this.documentosService.descargar(documento.id, documento.nombreArchivo).subscribe({
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'descargar el documento'));
      }
    });
  }

  onEliminar(documento: DocumentoAdjunto): void {
    if (!confirm('¿Eliminar este documento?')) return;
    this.documentosService.eliminar(documento.id).subscribe({
      next: () => {
        this.documentos = this.documentos.filter(d => d.id !== documento.id);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'eliminar el documento'));
      }
    });
  }

  cerrar(): void {
    this.documentos = [];
    this.closed.emit();
  }

  private cargarDocumentos(): void {
    if (!this.tipoEntidad || !this.entidadId) return;
    this.cargando = true;
    this.documentosService.listar(this.tipoEntidad, this.entidadId).subscribe({
      next: lista => {
        this.documentos = lista;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.notification.showError(this.errorHandler.getErrorMessage(err, 'cargar los documentos'));
      }
    });
  }
}
