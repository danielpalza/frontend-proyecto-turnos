import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfesionalService } from '../../../core/services/profesional.service';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfesionalCreateDTO, Profesional, MODULE_OPTIONS } from '../../../core/models';
import { fullName } from '../../../core/utils/full-name.util';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ProfesionalDialogComponent } from '../components/profesional-dialog/profesional-dialog.component';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-configuraciones-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfesionalDialogComponent],
  templateUrl: './configuraciones-view.component.html',
  styleUrls: ['./configuraciones-view.component.scss']
})
export class ConfiguracionesViewComponent implements OnInit, OnDestroy {
  profesionales: Profesional[] = [];

  showProfesionalForm = false;
  isSavingProfesional = false;
  saveProfesionalError = '';
  editingProfesional: Profesional | null = null;

  isDeleteConfirmOpen = false;
  isDeletingProfesional = false;
  deleteCandidate: Profesional | null = null;

  isTogglingActive = false;

  whatsappTemplate = '';
  whatsappSaved = false;
  readonly whatsappMaxLength = 1024;
  readonly whatsappPlaceholder = 'Hola {paciente}, te hablamos de Clinica del Oeste, te recordamos que tenes un turno el día {fecha} a las {hora} con el profesional {profesional}.\n\nEn caso de cualquier eventualidad te pedimos que nos contactes por este medio.\n\n¡Muchas gracias!';
  readonly whatsappPreviewData = {
    hora: '10:30',
    fecha: '15/07/2026',
    profesional: 'Diego Suarez',
    paciente: 'María García'
  } as const;
  readonly whatsappPlaceholderOptions = [
    { key: 'paciente' as const, label: 'Paciente', icon: 'bi-person' },
    { key: 'fecha' as const, label: 'Fecha', icon: 'bi-calendar3' },
    { key: 'hora' as const, label: 'Hora', icon: 'bi-clock' },
    { key: 'profesional' as const, label: 'Profesional', icon: 'bi-heart-pulse' }
  ];

  @ViewChild('whatsappTemplateInput') whatsappTemplateInput?: ElementRef<HTMLTextAreaElement>;

  readonly moduleOptions = MODULE_OPTIONS;

  private subscriptions = new Subscription();

  constructor(
    private profesionalService: ProfesionalService,
    private configurationService: ConfigurationService,
    private authService: AuthService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  get isOwner(): boolean {
    return this.authService.hasRole('OWNER');
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.profesionalService.getProfesionales().subscribe({
        next: (list) => { this.profesionales = list; this.cdr.markForCheck(); },
        error: (err) => {
          if (err?.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'cargar los profesionales');
            if (!this.errorHandler.isNetworkError(err)) this.notification.showError(message);
          }
        }
      })
    );
    this.whatsappTemplate = this.configurationService.getMensajeWhatsapp();
    this.subscriptions.add(
      this.configurationService.getConfig().subscribe({
        next: (cfg) => {
          if (cfg?.mensajeWhatsapp) {
            this.whatsappTemplate = cfg.mensajeWhatsapp;
            this.cdr.markForCheck();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getProfesionalInitials(nombre: string): string {
    const parts = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getProfesionalFullName(prof: Profesional): string {
    return fullName(prof.nombre, prof.apellido);
  }

  getProfesionalDetalle(prof: Profesional): string {
    const parts: string[] = [];
    if (prof.especialidad) parts.push(prof.especialidad);
    if (prof.matricula) parts.push(`Mat. ${prof.matricula}`);
    return parts.join(' • ');
  }

  getAvatarStyle(index: number): { [key: string]: string } {
    const palette = [
      { backgroundColor: 'rgba(75, 133, 245, 0.14)', color: '#4B85F5' },
      { backgroundColor: 'rgba(1, 225, 123, 0.16)', color: '#059669' },
      { backgroundColor: 'rgba(253, 205, 15, 0.22)', color: '#D97706' }
    ];
    return palette[index % palette.length];
  }

  openAddProfesional(): void {
    this.editingProfesional = null;
    this.saveProfesionalError = '';
    this.showProfesionalForm = true;
  }

  openEditProfesional(profesional: Profesional): void {
    this.editingProfesional = profesional;
    this.saveProfesionalError = '';
    this.showProfesionalForm = true;
  }

  closeAddProfesional(): void {
    this.showProfesionalForm = false;
    this.editingProfesional = null;
    this.isSavingProfesional = false;
  }

  onSaveProfesional(dto: ProfesionalCreateDTO): void {
    if (this.isSavingProfesional) return;
    this.isSavingProfesional = true;
    this.saveProfesionalError = '';
    const operation = this.editingProfesional?.id
      ? this.profesionalService.update(this.editingProfesional.id, dto)
      : this.profesionalService.create(dto);
    operation.subscribe({
      next: () => {
        this.isSavingProfesional = false;
        this.closeAddProfesional();
        this.notification.showSuccess(
          this.editingProfesional ? 'Profesional actualizado correctamente.' : 'Profesional creado correctamente.'
        );
      },
      error: (err: unknown) => {
        this.isSavingProfesional = false;
        const message = this.errorHandler.getErrorMessage(
          err,
          this.editingProfesional ? 'actualizar el profesional' : 'crear el profesional'
        );
        this.saveProfesionalError = message;
        if (!this.errorHandler.isNetworkError(err as any)) {
          this.notification.showError(message);
        }
      }
    });
  }

  onDeleteProfesional(profesional: Profesional): void {
    if (!profesional.id) return;
    this.openDeleteConfirm(profesional);
  }

  openDeleteConfirm(profesional: Profesional): void {
    if (this.isDeletingProfesional || !profesional.id) return;
    this.deleteCandidate = profesional;
    this.isDeleteConfirmOpen = true;
  }

  closeDeleteConfirm(): void {
    if (!this.isDeletingProfesional) {
      this.isDeleteConfirmOpen = false;
      this.deleteCandidate = null;
    }
  }

  confirmDeleteProfesional(): void {
    if (this.isDeletingProfesional) return;
    const id = this.deleteCandidate?.id;
    if (id == null) {
      this.closeDeleteConfirm();
      return;
    }
    this.isDeletingProfesional = true;
    this.profesionalService.delete(id)
      .pipe(finalize(() => { this.isDeletingProfesional = false; }))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Profesional eliminado correctamente.');
          this.isDeleteConfirmOpen = false;
          this.deleteCandidate = null;
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'eliminar el profesional');
          if (!this.errorHandler.isNetworkError(err as any)) {
            this.notification.showError(message);
          }
        }
      });
  }

  toggleProfesionalActive(profesional: Profesional): void {
    if (!profesional.id || this.isTogglingActive) return;
    this.isTogglingActive = true;
    this.profesionalService.toggleActive(profesional.id)
      .pipe(finalize(() => { this.isTogglingActive = false; }))
      .subscribe({
        next: () => {
          this.notification.showSuccess(
            profesional.activo === false
              ? 'Profesional activado correctamente.'
              : 'Profesional desactivado correctamente.'
          );
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cambiar el estado del profesional');
          if (!this.errorHandler.isNetworkError(err as any)) {
            this.notification.showError(message);
          }
        }
      });
  }

  get whatsappCharCount(): number {
    return this.whatsappTemplate?.length ?? 0;
  }

  get whatsappCharPercent(): number {
    return Math.min(100, (this.whatsappCharCount / this.whatsappMaxLength) * 100);
  }

  get whatsappCharsRemaining(): number {
    return this.whatsappMaxLength - this.whatsappCharCount;
  }

  get whatsappPreviewParts(): Array<{ text: string; highlight: boolean }> {
    const template = this.whatsappTemplate ?? '';
    const parts: Array<{ text: string; highlight: boolean }> = [];
    const pattern = /\{(hora|fecha|profesional|paciente)\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(template)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: template.slice(lastIndex, match.index), highlight: false });
      }
      const key = match[1] as keyof typeof this.whatsappPreviewData;
      parts.push({ text: this.whatsappPreviewData[key], highlight: true });
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < template.length) {
      parts.push({ text: template.slice(lastIndex), highlight: false });
    }

    return parts;
  }

  insertWhatsappPlaceholder(key: keyof typeof this.whatsappPreviewData): void {
    const token = `{${key}}`;
    const textarea = this.whatsappTemplateInput?.nativeElement;
    const current = this.whatsappTemplate ?? '';

    if (!textarea) {
      this.whatsappTemplate = (current + token).slice(0, this.whatsappMaxLength);
      return;
    }

    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? start;
    const nextValue = (current.slice(0, start) + token + current.slice(end)).slice(0, this.whatsappMaxLength);
    this.whatsappTemplate = nextValue;

    setTimeout(() => {
      textarea.focus();
      const cursor = Math.min(start + token.length, nextValue.length);
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  restoreDefaultWhatsappTemplate(): void {
    this.whatsappTemplate = this.whatsappPlaceholder;
  }

  saveWhatsappTemplate(): void {
    this.configurationService.saveMensajeWhatsapp(this.whatsappTemplate).subscribe({
      next: () => {
        this.whatsappSaved = true;
        setTimeout(() => { this.whatsappSaved = false; }, 3000);
      },
      error: (err: unknown) => {
        const message = this.errorHandler.getErrorMessage(err, 'guardar la configuracion del mensaje');
        if (!this.errorHandler.isNetworkError(err as any)) {
          this.notification.showError(message);
        }
      }
    });
  }
}