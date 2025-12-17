import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProfesionalService } from '../../../core/services/profesional.service';
import { Appointment, ProfesionalCreateDTO } from '../../../core/models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-seguimiento-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seguimiento-view.component.html',
  styleUrls: ['./seguimiento-view.component.scss']
})
export class SeguimientoViewComponent implements OnInit, OnDestroy {
  appointments: Appointment[] = [];

  searchTerm = '';

  showProfesionalForm = false;
  isSavingProfesional = false;
  saveProfesionalError = '';

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
    private appointmentsService: AppointmentsService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.appointmentsService.getAppointments().subscribe(appointments => {
        this.appointments = appointments;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get allAppointments(): Appointment[] {
    return this.appointments;
  }

  get filteredAppointments(): Appointment[] {
    return this.allAppointments.filter(app =>
      (app.patientName || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (app.patientDni || '').includes(this.searchTerm)
    );
  }

  get patientGroups() {
    const groups: Record<string, { patient: Appointment; appointments: Appointment[] }> = {};

    for (const app of this.filteredAppointments) {
      const key = app.patientDni || String(app.patientId);
      if (!groups[key]) {
        groups[key] = { patient: app, appointments: [] };
      }
      groups[key].appointments.push(app);
    }

    return Object.values(groups);
  }

  formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  openAddProfesional(): void {
    this.saveProfesionalError = '';
    this.showProfesionalForm = true;
  }

  closeAddProfesional(): void {
    this.showProfesionalForm = false;
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
    if (form.invalid || this.isSavingProfesional) {
      return;
    }

    this.isSavingProfesional = true;
    this.saveProfesionalError = '';

    this.profesionalService.create(this.nuevoProfesional).subscribe({
      next: () => {
        this.isSavingProfesional = false;
        this.closeAddProfesional();
      },
      error: (err: any) => {
        console.error('Error al guardar profesional', err);
        this.isSavingProfesional = false;
        this.saveProfesionalError =
          err?.error?.message || 'No se pudo guardar el profesional. Intente nuevamente.';
      }
    });
  }
}
