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

  expandedCards = new Set<number>(); // Rastrea qué tarjetas están expandidas
  paymentInputs = new Map<number, number>(); // Rastrea los valores de pago por tarjeta

  /**
   * Obtiene los appointments a mostrar
   */
  get displayAppointments(): Appointment[] {
    return this.appointments || [];
  }

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

  //  Obtiene el número de turnos a mostrar
  get appointmentsCount(): number {
    return this.displayAppointments.length;
  }

  //  Contor el total de pagos
  CountTotalPrice(precioBono?: number, precioTratamiento?: number, extras?: number, montoPago?: number): number {
    return (precioBono || 0)
         + (precioTratamiento || 0)
         + (extras || 0)
         - (montoPago || 0);
  }

  // Obtiene la clase CSS según el valor del total de pago
  getPaymentColorClass(precioBono?: number, precioTratamiento?: number, extras?: number, montoPago?: number): string {
    const total = this.CountTotalPrice(precioBono, precioTratamiento, extras, montoPago);
    return total > 0 ? 'text-danger' : 'text-success';
  }

  // Toggle del estado expandido/colapsado de una tarjeta
  toggleCard(cardId: number, event: Event): void {
    event.stopPropagation();
    if (this.expandedCards.has(cardId)) {
      this.expandedCards.delete(cardId);
    } else {
      this.expandedCards.add(cardId);
    }
  }

  // Verifica si una tarjeta está expandida
  isCardExpanded(cardId: number): boolean {
    return this.expandedCards.has(cardId);
  }

  // Obtiene el valor del input de pago para una tarjeta
  getPaymentInput(cardId: number): number {
    return this.paymentInputs.get(cardId) || 0;
  }

  // Actualiza el valor del input de pago
  updatePaymentInput(cardId: number, value: number): void {
    this.paymentInputs.set(cardId, value);
  }

  // Maneja el click del botón Agregar
  onAddPayment(cardId: number): void {
    const paymentValue = this.paymentInputs.get(cardId) || 0;
    if (paymentValue > 0) {
      // TODO: Implementar lógica para agregar el pago
      console.log('Agregar pago:', paymentValue, 'para turno:', cardId);
      // Limpiar el input después de agregar
      this.paymentInputs.set(cardId, 0);
    }
  }
}
