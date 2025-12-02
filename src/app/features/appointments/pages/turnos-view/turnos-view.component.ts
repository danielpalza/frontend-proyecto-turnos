import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MonthCalendarComponent } from '../../../calendar/components/month-calendar/month-calendar.component';
import { AppointmentsPanelComponent } from '../../components/appointments-panel/appointments-panel.component';
import { AppointmentDialogComponent } from '../../components/appointment-dialog/appointment-dialog.component';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { PatientService } from '../../../../core/services/patient.service';
import { ProfesionalService } from '../../../../core/services/profesional.service';
import { Appointment, AppointmentCreateDTO, Patient, Profesional } from '../../../../core/models';

@Component({
  selector: 'app-turnos-view',
  standalone: true,
  imports: [
    CommonModule,
    MonthCalendarComponent,
    AppointmentsPanelComponent,
    AppointmentDialogComponent
  ],
  templateUrl: './turnos-view.component.html',
  styleUrls: ['./turnos-view.component.scss']
})
export class TurnosViewComponent implements OnInit, OnDestroy {
  // Estado
  appointments: Appointment[] = [];
  patients: Patient[] = [];
  profesionales: Profesional[] = [];
  
  currentDate = new Date();
  selectedDate: string | null = null;
  isDialogOpen = false;
  isLoading = false;

  private subscriptions = new Subscription();

  constructor(
    private appointmentsService: AppointmentsService,
    private patientService: PatientService,
    private profesionalService: ProfesionalService
  ) {}

  ngOnInit(): void {
    // Suscribirse a los turnos
    this.subscriptions.add(
      this.appointmentsService.getAppointments().subscribe(appointments => {
        this.appointments = appointments;
      })
    );

    // Suscribirse a los pacientes
    this.subscriptions.add(
      this.patientService.getPatients().subscribe(patients => {
        this.patients = patients;
      })
    );

    // Suscribirse a los profesionales
    this.subscriptions.add(
      this.profesionalService.getProfesionales().subscribe(profesionales => {
        this.profesionales = profesionales;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onDateClick(date: string): void {
    this.selectedDate = date;
  }

  onMonthChange(date: Date): void {
    this.currentDate = date;
  }

  /**
   * Crear nuevo turno
   * Recibe los datos del formulario y crea el turno en el backend
   */
  onCreateAppointment(data: { patientData: Partial<Patient>; appointmentData: AppointmentCreateDTO }): void {
    if (!this.selectedDate) return;

    this.isLoading = true;

    // Si el paciente no existe (no tiene id), primero lo creamos
    if (!data.patientData.id) {
      this.patientService.create(data.patientData as Patient).subscribe({
        next: (newPatient) => {
          // Ahora crear el turno con el ID del paciente creado
          const appointmentData: AppointmentCreateDTO = {
            ...data.appointmentData,
            patientId: newPatient.id!,
            fecha: this.selectedDate!
          };
          this.createAppointment(appointmentData);
        },
        error: (err) => {
          console.error('Error creating patient:', err);
          this.isLoading = false;
          // TODO: Mostrar mensaje de error
        }
      });
    } else {
      // Paciente existente, crear turno directamente
      const appointmentData: AppointmentCreateDTO = {
        ...data.appointmentData,
        patientId: data.patientData.id,
        fecha: this.selectedDate!
      };
      this.createAppointment(appointmentData);
    }
  }

  private createAppointment(data: AppointmentCreateDTO): void {
    this.appointmentsService.create(data).subscribe({
      next: () => {
        this.isDialogOpen = false;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creating appointment:', err);
        this.isLoading = false;
        // TODO: Mostrar mensaje de error
      }
    });
  }

  onDeleteAppointment(id: number): void {
    this.appointmentsService.delete(id).subscribe({
      error: (err) => console.error('Error deleting appointment:', err)
    });
  }

  /**
   * Obtener turnos para una fecha (para el calendario)
   */
  getAppointmentsForDate = (date: string): Appointment[] => {
    return this.appointments.filter(app => app.fecha === date);
  };

  /**
   * Lista de pacientes existentes para el combobox
   */
  get existingPatients(): Patient[] {
    return this.patients;
  }

  /**
   * Lista de profesionales activos para el dropdown
   */
  get activeProfesionales(): Profesional[] {
    return this.profesionales.filter(p => p.activo !== false);
  }
}
