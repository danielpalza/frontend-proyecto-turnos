import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../../../core/models';

@Component({
  selector: 'app-appointments-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointments-panel.component.html',
  styleUrls: ['./appointments-panel.component.scss']
})
export class AppointmentsPanelComponent {
  @Input() date: string | null = null;
  @Input() appointments: Appointment[] = [];

  @Output() delete = new EventEmitter<number>();
  @Output() addClick = new EventEmitter<void>();

  formatDisplayDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getFormattedDay(dateStr: string): { dayName: string; dayNumber: number; month: string; year: number } {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return {
      dayName: days[date.getDay()],
      dayNumber: date.getDate(),
      month: months[date.getMonth()],
      year: date.getFullYear()
    };
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'CONFIRMADO': return 'bg-success';
      case 'PENDIENTE': return 'bg-warning text-dark';
      case 'EN_CURSO': return 'bg-info';
      case 'COMPLETADO': return 'bg-secondary';
      case 'CANCELADO': return 'bg-danger';
      case 'NO_ASISTIO': return 'bg-dark';
      default: return 'bg-secondary';
    }
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'CONFIRMADO': return 'Confirmado';
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_CURSO': return 'En Curso';
      case 'COMPLETADO': return 'Completado';
      case 'CANCELADO': return 'Cancelado';
      case 'NO_ASISTIO': return 'No Asistió';
      default: return status || 'Sin estado';
    }
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';
    // El backend envía formato HH:mm:ss, mostramos HH:mm
    return time.substring(0, 5);
  }
}
