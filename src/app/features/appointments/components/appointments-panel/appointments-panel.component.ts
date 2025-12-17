import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../../../core/models';
import { AppointmentsService } from '../../../../core/services/appointments.service';

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

  constructor(private appointmentsService: AppointmentsService) {}

  expandedCards = new Set<number>(); // Rastrea qué tarjetas están expandidas
  paymentInputs = new Map<number, number>(); // Rastrea los valores de pago por tarjeta
  editingPrices = new Map<string, boolean>(); // Rastrea qué precios están siendo editados (key: "cardId-priceType")
  priceInputs = new Map<string, number>(); // Rastrea los valores temporales de los inputs de precio (key: "cardId-priceType")
  originalPrices = new Map<string, number>(); // Guarda los valores originales antes de editar
  editingObservaciones = new Map<number, boolean>(); // Rastrea qué observaciones están siendo editadas
  observacionesInputs = new Map<number, string>(); // Rastrea los valores temporales de las observaciones
  originalObservaciones = new Map<number, string>(); // Guarda los valores originales antes de editar

  /**
   * Obtiene los appointments a mostrar
   */
  get displayAppointments(): Appointment[] {
    // console.log(this.appointments);
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

  // Agrega el pago a un turno
  onAddPayment(cardId: number): void {
    const paymentValue = this.paymentInputs.get(cardId) || 0;
    if (paymentValue > 0) {
      this.appointmentsService.addPayment(cardId, paymentValue).subscribe({
        next: () => {
          // Limpiar el input después de agregar el pago exitosamente
          this.paymentInputs.set(cardId, 0);
        },
        error: (err) => {
          console.error('Error al agregar pago:', err);
          // TODO: Mostrar mensaje de error al usuario
        }
      });
    }
  }

  // Inicia la edición de un precio
  startEditingPrice(cardId: number, priceType: 'bono' | 'tratamiento' | 'extras', currentValue?: number): void {
    const key = `${cardId}-${priceType}`;
    this.editingPrices.set(key, true);
    this.priceInputs.set(key, currentValue || 0);
    this.originalPrices.set(key, currentValue || 0);
  }

  // Verifica si un precio está siendo editado
  isEditingPrice(cardId: number, priceType: 'bono' | 'tratamiento' | 'extras'): boolean {
    const key = `${cardId}-${priceType}`;
    return this.editingPrices.get(key) || false;
  }

  // Obtiene el valor del input de precio
  getPriceInput(cardId: number, priceType: 'bono' | 'tratamiento' | 'extras'): number {
    const key = `${cardId}-${priceType}`;
    return this.priceInputs.get(key) || 0;
  }

  // Actualiza el valor del input de precio
  updatePriceInput(cardId: number, priceType: 'bono' | 'tratamiento' | 'extras', value: number): void {
    const key = `${cardId}-${priceType}`;
    this.priceInputs.set(key, value);
  }

  // Guarda el precio editado
  savePrice(cardId: number, priceType: 'bono' | 'tratamiento' | 'extras'): void {
    const key = `${cardId}-${priceType}`;
    const newValue = this.priceInputs.get(key) || 0;
    
    // Obtener el appointment actual para construir el objeto de actualización
    const appointment = this.appointments.find(a => a.id === cardId);
    if (!appointment) return;

    const updateData: any = {};
    
    if (priceType === 'bono') {
      updateData.precioBono = newValue;
    } else if (priceType === 'tratamiento') {
      updateData.precioTratamiento = newValue;
    } else if (priceType === 'extras') {
      updateData.extras = newValue;
    }

    this.appointmentsService.update(cardId, updateData).subscribe({
      next: () => {
        this.editingPrices.set(key, false);
        this.priceInputs.delete(key);
        this.originalPrices.delete(key);
      },
      error: (err) => {
        console.error(`Error al actualizar ${priceType}:`, err);
        // Restaurar valor original en caso de error
        this.priceInputs.set(key, this.originalPrices.get(key) || 0);
        this.editingPrices.set(key, false);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  // Cancela la edición de un precio
  cancelPriceEdit(cardId: number, priceType: 'bono' | 'tratamiento' | 'extras'): void {
    const key = `${cardId}-${priceType}`;
    this.editingPrices.set(key, false);
    this.priceInputs.delete(key);
    this.originalPrices.delete(key);
  }

  // Inicia la edición de observaciones
  startEditingObservaciones(cardId: number, currentValue?: string): void {
    this.editingObservaciones.set(cardId, true);
    this.observacionesInputs.set(cardId, currentValue || '');
    this.originalObservaciones.set(cardId, currentValue || '');
  }

  // Verifica si las observaciones están siendo editadas
  isEditingObservaciones(cardId: number): boolean {
    return this.editingObservaciones.get(cardId) || false;
  }

  // Obtiene el valor del input de observaciones
  getObservacionesInput(cardId: number): string {
    return this.observacionesInputs.get(cardId) || '';
  }

  // Actualiza el valor del input de observaciones
  updateObservacionesInput(cardId: number, value: string): void {
    this.observacionesInputs.set(cardId, value);
  }

  // Guarda las observaciones editadas
  saveObservaciones(cardId: number): void {
    const newValue = this.observacionesInputs.get(cardId) || '';
    
    const updateData = {
      observaciones: newValue
    };

    this.appointmentsService.update(cardId, updateData).subscribe({
      next: () => {
        this.editingObservaciones.set(cardId, false);
        this.observacionesInputs.delete(cardId);
        this.originalObservaciones.delete(cardId);
      },
      error: (err) => {
        console.error('Error al actualizar observaciones:', err);
        // Restaurar valor original en caso de error
        this.observacionesInputs.set(cardId, this.originalObservaciones.get(cardId) || '');
        this.editingObservaciones.set(cardId, false);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  // Cancela la edición de observaciones
  cancelObservacionesEdit(cardId: number): void {
    this.editingObservaciones.set(cardId, false);
    this.observacionesInputs.delete(cardId);
    this.originalObservaciones.delete(cardId);
  }
}
