import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonthCalendarComponent } from '../../../calendar/components/month-calendar/month-calendar.component';
import { AppointmentsPanelComponent } from '../../components/appointments-panel/appointments-panel.component';
import { AppointmentDialogComponent } from '../../components/appointment-dialog/appointment-dialog.component';
import { Appointment } from '../../models/appointment.model';

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
export class TurnosViewComponent {
  // Estado local de turnos
  appointments: Appointment[] = [];

  currentDate = new Date();
  selectedDate: string | null = null;
  isDialogOpen = false;

  onDateClick(date: string) {
    this.selectedDate = date;
  }

  onMonthChange(date: Date) {
    this.currentDate = date;
  }

  addAppointmentInternal(data: Omit<Appointment, 'id' | 'date'>) {
    if (!this.selectedDate) {
      return;
    }

    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      date: this.selectedDate,
      ...data
    };

    this.appointments = [...this.appointments, newAppointment];
    this.isDialogOpen = false;
  }

  onDeleteAppointment(id: string) {
    this.appointments = this.appointments.filter(app => app.id !== id);
  }

  // Arrow function para mantener el this correcto cuando se pasa como Input
  getAppointmentsForDate = (date: string): Appointment[] => {
    return this.appointments.filter(app => app.date === date);
  };

  get existingPatients() {
    return this.appointments.map(app => ({
      nombreApellido: app.nombreApellido,
      dni: app.dni,
      email: app.email
    }));
  }
}

