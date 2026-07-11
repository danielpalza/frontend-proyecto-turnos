import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfesionalService } from '../../../../core/services/profesional.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfesionalCreateDTO, Profesional, MODULE_OPTIONS } from '../../../../core/models';
import { fullName } from '../../../../core/utils/full-name.util';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { ProfesionalDialogComponent } from '../../../configuraciones/components/profesional-dialog/profesional-dialog.component';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-profesionales-panel',
  standalone: true,
  imports: [CommonModule, ProfesionalDialogComponent],
  templateUrl: './profesionales-panel.component.html',
  styleUrls: ['./profesionales-panel.component.scss']
})
export class ProfesionalesPanelComponent implements OnInit, OnDestroy {
  profesionales: Profesional[] = [];

  showProfesionalForm = false;
  isSavingProfesional = false;
  saveProfesionalError = '';
  editingProfesional: Profesional | null = null;

  isDeleteConfirmOpen = false;
  isDeletingProfesional = false;
  deleteCandidate: Profesional | null = null;

  isTogglingActive = false;

  readonly moduleOptions = MODULE_OPTIONS;

  private subscriptions = new Subscription();

  constructor(
    private profesionalService: ProfesionalService,
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
    if (prof.dni) parts.push(`DNI ${prof.dni}`);
    // if (prof.matricula) parts.push(`Mat. ${prof.matricula}`);
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
}
