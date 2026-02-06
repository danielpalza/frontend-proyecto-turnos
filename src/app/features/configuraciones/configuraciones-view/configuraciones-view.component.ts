import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProfesionalService } from '../../../core/services/profesional.service';
import { EstadoProfesionalService } from '../../../core/services/estado-profesional.service';
import { ProfesionalCreateDTO, Profesional, EstadoProfesional } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ConfirmDialogComponent } from '../../appointments/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-configuraciones-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
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

  isDeleteConfirmOpen = false;
  isDeletingProfesional = false;
  deleteCandidateId: number | null = null;
  deleteCandidateSummary: string | null = null;

  showEstadoProfesionalModal = false;
  estadoProfesionalSelected: string = '';
  estadoProfesionalDesde: string | null = null;
  estadoProfesionalHasta: string | null = null;
  isSavingEstadoProfesional = false;
  estadoProfesionalTarget: Profesional | null = null;
  estadoProfesionalError = '';

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
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.profesionalService.getProfesionales().subscribe({
        next: (list) => { this.profesionales = list; },
        error: (err) => {
          if (err?.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'cargar los profesionales');
            if (!this.errorHandler.isNetworkError(err)) this.notification.showError(message);
          }
        }
      })
    );
    this.subscriptions.add(
      this.estadoProfesionalService.findAll().subscribe({
        next: (estados) => { this.estadoProfesionalList = estados; },
        error: (err) => {
          if (err?.status !== 404 && !this.errorHandler.isNetworkError(err)) {
            this.notification.showError(this.errorHandler.getErrorMessage(err, 'cargar los estados'));
          }
        }
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
    const operation = this.editingProfesional
      ? this.profesionalService.update(this.editingProfesional.id!, this.nuevoProfesional)
      : this.profesionalService.create(this.nuevoProfesional);
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
    this.deleteCandidateId = profesional.id;
    this.deleteCandidateSummary = [profesional.nombre || 'Profesional', profesional.especialidad ? `- ${profesional.especialidad}` : null].filter(Boolean).join(' ') || null;
    this.isDeleteConfirmOpen = true;
  }

  closeDeleteConfirm(): void {
    if (!this.isDeletingProfesional) {
      this.isDeleteConfirmOpen = false;
      this.deleteCandidateId = null;
      this.deleteCandidateSummary = null;
    }
  }

  onDeleteConfirmOpenChange(open: boolean): void {
    this.isDeleteConfirmOpen = open;
    if (!open && !this.isDeletingProfesional) {
      this.deleteCandidateId = null;
      this.deleteCandidateSummary = null;
    }
  }

  confirmDeleteProfesional(): void {
    if (this.isDeletingProfesional) return;
    const id = this.deleteCandidateId;
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
          this.deleteCandidateId = null;
          this.deleteCandidateSummary = null;
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
          this.estadoProfesionalError = this.errorHandler.getErrorMessage(err as any, 'cargar los estados del profesional');
          if (!this.errorHandler.isNetworkError(err as any)) {
            this.notification.showError(this.estadoProfesionalError);
          }
        }
      });
    }
  }

  closeEstadoProfesionalModal(): void {
    if (this.isSavingEstadoProfesional) return;
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
          this.notification.showSuccess('Estado del profesional actualizado correctamente.');
          this.closeEstadoProfesionalModal();
        },
        error: (err: unknown) => {
          this.estadoProfesionalError = this.errorHandler.getErrorMessage(err as any, 'actualizar el estado del profesional');
          if (!this.errorHandler.isNetworkError(err as any)) {
            this.notification.showError(this.estadoProfesionalError);
          }
        }
      });
  }
}
