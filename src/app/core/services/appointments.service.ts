import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Appointment } from '../../features/appointments/models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private appointments$ = new BehaviorSubject<Appointment[]>([]);

  getAppointments() {
    return this.appointments$.asObservable();
  }

  addAppointment(appointment: Appointment) {
    const current = this.appointments$.value;
    this.appointments$.next([...current, appointment]);
  }

  deleteAppointment(id: string) {
    const updated = this.appointments$.value.filter(a => a.id !== id);
    this.appointments$.next(updated);
  }

  getAppointmentsForDate(date: string): Appointment[] {
    return this.appointments$.value.filter(app => app.date === date);
  }

  getAllAppointments(): Appointment[] {
    return this.appointments$.value;
  }
}

