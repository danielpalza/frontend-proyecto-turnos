import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProfesionalService } from '../../../core/services/profesional.service';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { ProfesionalCreateDTO, Profesional } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-configuraciones-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  readonly whatsappPlaceholder = 'Hola {paciente}, te hablamos de Clinica del Oeste, te recordamos que tenes un turno el día {fecha} a las {hora} con el doctor {doctor}.\nEn caso de cualquier eventualidad te pedimos que nos contactes por este medio.\n¡Muchas gracias!';
  readonly whatsappPreviewData = {
    hora: '10:30',
    fecha: '15/07/2026',
    doctor: 'Diego Suarez',
    paciente: 'María García'
  } as const;
  readonly whatsappPlaceholderOptions = [
    { key: 'hora' as const, label: '{hora}', icon: 'bi-clock', legend: 'hora del turno' },
    { key: 'fecha' as const, label: '{fecha}', icon: 'bi-calendar3', legend: 'fecha del turno' },
    { key: 'doctor' as const, label: '{doctor}', icon: 'bi-heart-pulse', legend: 'nombre del usuario' },
    { key: 'paciente' as const, label: '{paciente}', icon: 'bi-person', legend: 'nombre del paciente' }
  ];

  @ViewChild('whatsappTemplateInput') whatsappTemplateInput?: ElementRef<HTMLTextAreaElement>;

  nuevoProfesional: ProfesionalCreateDTO = {
    nombre: '',
    dni: '',
    especialidad: '',
    matricula: '',
    email: '',
    telefono: '',
    activo: true
  };

  private subscriptions = new Subscription();

  constructor(
    private profesionalService: ProfesionalService,
    private configurationService: ConfigurationService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.profesionalService.getProfesionales().subscribe({
        next: (list) => { this.profesionales = list; this.cdr.markForCheck(); },
        error: (err) => {
          if (err?.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'cargar los usuarios');
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
    this.resetProfesionalForm();
    this.showProfesionalForm = true;
  }

  openEditProfesional(profesional: Profesional): void {
    this.editingProfesional = profesional;
    this.saveProfesionalError = '';
    this.nuevoProfesional = {
      nombre: profesional.nombre || '',
      dni: profesional.dni || '',
      especialidad: profesional.especialidad || '',
      matricula: profesional.matricula || '',
      email: profesional.email || '',
      telefono: profesional.telefono || '',
      activo: profesional.activo !== false
    };
    this.showProfesionalForm = true;
  }

  closeAddProfesional(): void {
    this.showProfesionalForm = false;
    this.editingProfesional = null;
    this.resetProfesionalForm();
  }

  private resetProfesionalForm(): void {
    this.nuevoProfesional = {
      nombre: '',
      dni: '',
      especialidad: '',
      matricula: '',
      email: '',
      telefono: '',
      activo: true
    };
    this.isSavingProfesional = false;
  }

  onSaveProfesional(form: NgForm): void {
    if (form.invalid || this.isSavingProfesional) return;
    this.isSavingProfesional = true;
    this.saveProfesionalError = '';
    const operation = this.editingProfesional?.id
      ? this.profesionalService.update(this.editingProfesional.id, this.nuevoProfesional)
      : this.profesionalService.create(this.nuevoProfesional);
    operation.subscribe({
      next: () => {
        this.isSavingProfesional = false;
        this.closeAddProfesional();
        this.notification.showSuccess(
          this.editingProfesional ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.'
        );
      },
      error: (err: unknown) => {
        this.isSavingProfesional = false;
        const message = this.errorHandler.getErrorMessage(
          err,
          this.editingProfesional ? 'actualizar el usuario' : 'crear el usuario'
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
          this.notification.showSuccess('Usuario eliminado correctamente.');
          this.isDeleteConfirmOpen = false;
          this.deleteCandidate = null;
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'eliminar el usuario');
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
              ? 'Usuario activado correctamente.'
              : 'Usuario desactivado correctamente.'
          );
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cambiar el estado del usuario');
          if (!this.errorHandler.isNetworkError(err as any)) {
            this.notification.showError(message);
          }
        }
      });
  }

  get whatsappCharCount(): number {
    return this.whatsappTemplate?.length ?? 0;
  }

  get whatsappPreviewParts(): Array<{ text: string; highlight: boolean }> {
    const template = this.whatsappTemplate ?? '';
    const parts: Array<{ text: string; highlight: boolean }> = [];
    const pattern = /\{(hora|fecha|doctor|paciente)\}/g;
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