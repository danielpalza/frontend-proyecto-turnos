import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProfesionalService } from '../../../core/services/profesional.service';
import { EstadoProfesionalService } from '../../../core/services/estado-profesional.service';
import { ProfesionalCreateDTO, Profesional, EstadoProfesional } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { WhatsappConfigService } from '../../../core/services/whatsapp-config.service';

@Component({
  selector: 'app-configuraciones-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuraciones-view.component.html',
  styleUrls: ['./configuraciones-view.component.scss']
})
export class ConfiguracionesViewComponent implements OnInit, OnDestroy {
  profesionales: Profesional[] = [];
  estadoProfesionalList: EstadoProfesional[] = [];

  showProfesionalForm = false;
  isSavingProfesional = false;
  saveProfesionalError = '';
  editingProfesional: Profesional | null = null;
  selectedRol: 'basico' | 'administrador' = 'administrador';

  isDeleteConfirmOpen = false;
  isDeletingProfesional = false;
  deleteCandidate: Profesional | null = null;

  showEstadoProfesionalModal = false;
  estadoProfesionalSelected: string = '';
  estadoProfesionalDesde: string | null = null;
  estadoProfesionalHasta: string | null = null;
  isSavingEstadoProfesional = false;
  estadoProfesionalTarget: Profesional | null = null;
  estadoProfesionalError = '';

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
    private estadoProfesionalService: EstadoProfesionalService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private whatsappConfig: WhatsappConfigService,
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
    this.subscriptions.add(
      this.estadoProfesionalService.findAll().subscribe({
        next: (estados) => { this.estadoProfesionalList = estados; this.cdr.markForCheck(); },
        error: (err) => {
          if (err?.status !== 404 && !this.errorHandler.isNetworkError(err)) {
            this.notification.showError(this.errorHandler.getErrorMessage(err, 'cargar los estados'));
          }
        }
      })
    );
    this.subscriptions.add(
      this.whatsappConfig.getTemplate().subscribe(template => {
        this.whatsappTemplate = template;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getEstadoColor(estadoNombre: string | undefined): string {
    if (!estadoNombre) return '#6c757d';
    const estado = this.estadoProfesionalList.find(e => e.estado === estadoNombre);
    return (estado?.colorHex && /^#[0-9A-Fa-f]{6}$/.test(estado.colorHex)) ? estado.colorHex : '#6c757d';
  }

  getEstadoBadgeStyle(estadoNombre: string | undefined): { [key: string]: string } {
    const color = this.getEstadoColor(estadoNombre);
    return {
      backgroundColor: this.hexToRgba(color, 0.14),
      color
    };
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

  getTargetAvatarStyle(): { [key: string]: string } {
    if (!this.estadoProfesionalTarget?.id) {
      return this.getAvatarStyle(0);
    }
    const index = this.profesionales.findIndex(p => p.id === this.estadoProfesionalTarget?.id);
    return this.getAvatarStyle(index >= 0 ? index : 0);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  openAddProfesional(): void {
    this.editingProfesional = null;
    this.saveProfesionalError = '';
    this.selectedRol = 'administrador';
    this.resetProfesionalForm();
    this.showProfesionalForm = true;
  }

  openEditProfesional(profesional: Profesional): void {
    this.editingProfesional = profesional;
    this.saveProfesionalError = '';
    this.selectedRol = 'administrador';
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
    this.selectedRol = 'administrador';
    this.isSavingProfesional = false;
  }

  selectRol(rol: 'basico' | 'administrador'): void {
    this.selectedRol = rol;
  }

  onSaveProfesional(form: NgForm): void {
    if (form.invalid || this.isSavingProfesional) return;
    this.isSavingProfesional = true;
    this.saveProfesionalError = '';
    const operation = this.editingProfesional
      ? this.profesionalService.update(this.editingProfesional.id!, this.nuevoProfesional)
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
    this.openEstadoProfesionalModal(profesional);
  }

  openEstadoProfesionalModal(profesional: Profesional): void {
    if (!profesional.id) return;
    this.estadoProfesionalTarget = profesional;
    this.estadoProfesionalError = '';
    this.estadoProfesionalSelected = profesional.estado || 'Disponible';
    this.estadoProfesionalDesde = profesional.desde || null;
    this.estadoProfesionalHasta = profesional.hasta || null;
    this.showEstadoProfesionalModal = true;
    if (this.estadoProfesionalList.length === 0) {
      this.estadoProfesionalService.findAll().subscribe({
        next: (estados) => { this.estadoProfesionalList = estados; },
        error: (err: unknown) => {
          this.estadoProfesionalError = this.errorHandler.getErrorMessage(err as any, 'cargar los estados del usuario');
          if (!this.errorHandler.isNetworkError(err as any)) {
            this.notification.showError(this.estadoProfesionalError);
          }
        }
      });
    }
  }

  closeEstadoProfesionalModal(): void {
    if (this.isSavingEstadoProfesional) return;
    this.forceCloseEstadoProfesionalModal();
  }

  private forceCloseEstadoProfesionalModal(): void {
    this.showEstadoProfesionalModal = false;
    this.estadoProfesionalTarget = null;
    this.estadoProfesionalError = '';
  }

  saveEstadoProfesional(): void {
    if (!this.estadoProfesionalTarget?.id || this.isSavingEstadoProfesional) return;
    const id = this.estadoProfesionalTarget.id;
    const target = this.estadoProfesionalTarget;
    const payload: ProfesionalCreateDTO = {
      nombre: target.nombre ?? '',
      dni: target.dni,
      especialidad: target.especialidad,
      matricula: target.matricula,
      email: target.email,
      telefono: target.telefono,
      activo: target.activo !== false,
      estado: this.estadoProfesionalSelected || 'Disponible',
      desde: this.estadoProfesionalDesde || undefined,
      hasta: this.estadoProfesionalHasta || undefined
    };
    this.isSavingEstadoProfesional = true;
    this.profesionalService.update(id, payload)
      .pipe(finalize(() => { this.isSavingEstadoProfesional = false; }))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Estado del usuario actualizado correctamente.');
          this.forceCloseEstadoProfesionalModal();
        },
        error: (err: unknown) => {
          this.estadoProfesionalError = this.errorHandler.getErrorMessage(err as any, 'actualizar el estado del usuario');
          if (!this.errorHandler.isNetworkError(err as any)) {
            this.notification.showError(this.estadoProfesionalError);
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
    this.whatsappConfig.setTemplate(this.whatsappTemplate).subscribe({
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
