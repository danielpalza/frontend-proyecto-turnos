import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Appointment {
  id: string;
  nombreApellido: string;
  dni: string;
  email: string;
  telefono: string;
  edad: string;
  obraSocialNombre: string;
  date: string;
}

@Component({
  selector: 'app-seguimiento-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seguimiento-view.component.html',
  styleUrls: ['./seguimiento-view.component.scss']
})
export class SeguimientoViewComponent {
  @Input() appointments: Appointment[] = [];

  searchTerm = '';

  // Datos mock para demostración
  mockAppointments: Appointment[] = [
    {
      id: '1',
      nombreApellido: 'María González',
      dni: '30456789',
      email: 'maria.gonzalez@email.com',
      telefono: '11-4567-8901',
      edad: '35',
      obraSocialNombre: 'OSDE',
      date: '2024-11-15'
    },
    {
      id: '2',
      nombreApellido: 'María González',
      dni: '30456789',
      email: 'maria.gonzalez@email.com',
      telefono: '11-4567-8901',
      edad: '35',
      obraSocialNombre: 'OSDE',
      date: '2024-11-10'
    },
    {
      id: '3',
      nombreApellido: 'Juan Pérez',
      dni: '28123456',
      email: 'juan.perez@email.com',
      telefono: '11-2345-6789',
      edad: '42',
      obraSocialNombre: 'Swiss Medical',
      date: '2024-11-12'
    },
    {
      id: '4',
      nombreApellido: 'Ana Rodríguez',
      dni: '35789012',
      email: 'ana.rodriguez@email.com',
      telefono: '11-3456-7890',
      edad: '28',
      obraSocialNombre: 'Galeno',
      date: '2024-11-08'
    }
  ];

  get allAppointments(): Appointment[] {
    return this.appointments.length > 0 ? this.appointments : this.mockAppointments;
  }

  get filteredAppointments(): Appointment[] {
    return this.allAppointments.filter(app =>
      app.nombreApellido.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      app.dni.includes(this.searchTerm) ||
      app.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get patientGroups() {
    const groups: Record<string, { patient: Appointment; appointments: Appointment[] }> = {};

    for (const app of this.filteredAppointments) {
      const key = app.dni;
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
}

