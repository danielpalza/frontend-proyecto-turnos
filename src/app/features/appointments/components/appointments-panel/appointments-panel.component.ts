import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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
export class AppointmentsPanelComponent implements OnChanges {
  @Input() date: string | null = null;
  @Input() appointments: Appointment[] = [];

  @Output() delete = new EventEmitter<number>();
  @Output() addClick = new EventEmitter<void>();

  constructor(private appointmentsService: AppointmentsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Limpiar expandedCards cuando cambia la fecha
    if (changes['date'] && !changes['date'].firstChange) {
      this.expandedCards.clear();
    }
  }

  expandedCards = new Set<number>(); // Rastrea qué tarjetas están expandidas
  paymentInputs = new Map<number, number>(); // Rastrea los valores de pago por tarjeta
  editingPrices = new Map<string, boolean>(); // Rastrea qué precios están siendo editados (key: "cardId-priceType")
  priceInputs = new Map<string, number>(); // Rastrea los valores temporales de los inputs de precio (key: "cardId-priceType")
  originalPrices = new Map<string, number>(); // Guarda los valores originales antes de editar
  editingObservaciones = new Map<number, boolean>(); // Rastrea qué observaciones están siendo editadas
  observacionesInputs = new Map<number, string>(); // Rastrea los valores temporales de las observaciones
  originalObservaciones = new Map<number, string>(); // Guarda los valores originales antes de editar
  editingObservacionesTurno = new Map<number, boolean>(); // Rastrea qué observaciones del turno están siendo editadas
  observacionesTurnoInputs = new Map<number, string>(); // Rastrea los valores temporales de las observaciones del turno
  originalObservacionesTurno = new Map<number, string>(); // Guarda los valores originales antes de editar
  editingHora = new Map<number, boolean>(); // Rastrea qué horas están siendo editadas
  horaInputs = new Map<number, string>(); // Rastrea los valores temporales de las horas
  originalHora = new Map<number, string>(); // Guarda los valores originales antes de editar

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
    
    // Validar que tenga al menos 5 caracteres (formato HH:mm)
    if (time.length < 5) {
      console.warn('Formato de hora inválido:', time);
      return ''; // Retornar string vacío si el formato es inválido
    }
    
    // El backend envía formato HH:mm:ss, mostramos HH:mm
    return time.substring(0, 5);
  }

  //  Obtiene el número de turnos a mostrar
  get appointmentsCount(): number {
    return this.displayAppointments.length;
  }

  // Obtiene la clase CSS según el valor del total de pago
  // Ahora usa el totalPrecio calculado en el backend
  getPaymentColorClass(totalPrecio?: number): string {
    const total = totalPrecio || 0;
    return total > 0 ? 'text-danger' : 'text-success';
  }

  /** Indica si el turno tiene saldo pendiente de pago (totalPrecio > 0). */
  hasPendingDebt(app: Appointment): boolean {
    return (app.totalPrecio ?? 0) > 0;
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

  // Agrega el pago a un turno (usa lógica compartida del servicio)
  onAddPayment(cardId: number): void {
    const paymentValue = this.paymentInputs.get(cardId) || 0;
    this.appointmentsService.addPaymentWithFeedback(cardId, paymentValue).subscribe({
      next: () => this.paymentInputs.set(cardId, 0),
      error: () => { /* notificación ya mostrada por el servicio */ }
    });
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

  // Guarda el precio editado (usa lógica compartida del servicio)
  savePrice(cardId: number, priceType: 'bono' | 'tratamiento' | 'extras'): void {
    const key = `${cardId}-${priceType}`;
    const newValue = this.priceInputs.get(key) || 0;
    const appointment = this.appointments.find(a => a.id === cardId);
    if (!appointment) return;

    const updateData: Record<string, number> = {};
    if (priceType === 'bono') updateData['precioBono'] = newValue;
    else if (priceType === 'tratamiento') updateData['precioTratamiento'] = newValue;
    else if (priceType === 'extras') updateData['extras'] = newValue;

    const label = priceType === 'bono' ? 'bono' : priceType === 'tratamiento' ? 'tratamiento' : 'extras';
    this.appointmentsService.updateWithFeedback(cardId, updateData, `Precio (${label}) actualizado.`, `actualizar ${label}`).subscribe({
      next: () => {
        this.editingPrices.set(key, false);
        this.priceInputs.delete(key);
        this.originalPrices.delete(key);
      },
      error: () => {
        this.priceInputs.set(key, this.originalPrices.get(key) || 0);
        this.editingPrices.set(key, false);
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

  // Guarda las observaciones editadas (usa lógica compartida del servicio)
  saveObservaciones(cardId: number): void {
    const newValue = this.observacionesInputs.get(cardId) || '';
    this.appointmentsService.updateWithFeedback(
      cardId,
      { observaciones: newValue },
      'Observaciones de pago guardadas.',
      'actualizar las observaciones'
    ).subscribe({
      next: () => {
        this.editingObservaciones.set(cardId, false);
        this.observacionesInputs.delete(cardId);
        this.originalObservaciones.delete(cardId);
      },
      error: () => {
        this.observacionesInputs.set(cardId, this.originalObservaciones.get(cardId) || '');
        this.editingObservaciones.set(cardId, false);
      }
    });
  }

  // Cancela la edición de observaciones
  cancelObservacionesEdit(cardId: number): void {
    this.editingObservaciones.set(cardId, false);
    this.observacionesInputs.delete(cardId);
    this.originalObservaciones.delete(cardId);
  }

  // Inicia la edición de observaciones del turno
  startEditingObservacionesTurno(cardId: number, currentValue?: string): void {
    this.editingObservacionesTurno.set(cardId, true);
    this.observacionesTurnoInputs.set(cardId, currentValue || '');
    this.originalObservacionesTurno.set(cardId, currentValue || '');
  }

  // Verifica si las observaciones del turno están siendo editadas
  isEditingObservacionesTurno(cardId: number): boolean {
    return this.editingObservacionesTurno.get(cardId) || false;
  }

  // Obtiene el valor del input de observaciones del turno
  getObservacionesTurnoInput(cardId: number): string {
    return this.observacionesTurnoInputs.get(cardId) || '';
  }

  // Actualiza el valor del input de observaciones del turno
  updateObservacionesTurnoInput(cardId: number, value: string): void {
    this.observacionesTurnoInputs.set(cardId, value);
  }

  // Guarda las observaciones del turno editadas (usa lógica compartida del servicio)
  saveObservacionesTurno(cardId: number): void {
    const newValue = this.observacionesTurnoInputs.get(cardId) || '';
    this.appointmentsService.updateWithFeedback(
      cardId,
      { observacionesTurno: newValue },
      'Observaciones del turno guardadas.',
      'actualizar las observaciones del turno'
    ).subscribe({
      next: () => {
        this.editingObservacionesTurno.set(cardId, false);
        this.observacionesTurnoInputs.delete(cardId);
        this.originalObservacionesTurno.delete(cardId);
      },
      error: () => {
        this.observacionesTurnoInputs.set(cardId, this.originalObservacionesTurno.get(cardId) || '');
        this.editingObservacionesTurno.set(cardId, false);
      }
    });
  }

  // Cancela la edición de observaciones del turno
  cancelObservacionesTurnoEdit(cardId: number): void {
    this.editingObservacionesTurno.set(cardId, false);
    this.observacionesTurnoInputs.delete(cardId);
    this.originalObservacionesTurno.delete(cardId);
  }

  // Inicia la edición de hora
  startEditingHora(cardId: number, currentValue?: string): void {
    this.editingHora.set(cardId, true);
    // Convertir formato HH:mm:ss a HH:mm para el input type="time"
    const horaValue = currentValue ? currentValue.substring(0, 5) : '';
    this.horaInputs.set(cardId, horaValue);
    this.originalHora.set(cardId, horaValue);
  }

  // Verifica si la hora está siendo editada
  isEditingHora(cardId: number): boolean {
    return this.editingHora.get(cardId) || false;
  }

  // Obtiene el valor del input de hora
  getHoraInput(cardId: number): string {
    return this.horaInputs.get(cardId) || '';
  }

  // Actualiza el valor del input de hora
  updateHoraInput(cardId: number, value: string): void {
    this.horaInputs.set(cardId, value);
  }

  // Guarda la hora editada
  saveHora(cardId: number): void {
    const newValue = this.horaInputs.get(cardId) || '';
    
    // Convertir formato HH:mm a HH:mm:ss para el backend, o null si está vacío
    const horaFormatted = newValue && newValue.trim() !== '' ? `${newValue}:00` : null;
    
    const updateData: any = {
      hora: horaFormatted
    };

    this.appointmentsService.update(cardId, updateData).subscribe({
      next: () => {
        this.editingHora.set(cardId, false);
        this.horaInputs.delete(cardId);
        this.originalHora.delete(cardId);
      },
      error: (err) => {
        console.error('Error al actualizar hora:', err);
        // Restaurar valor original en caso de error
        this.horaInputs.set(cardId, this.originalHora.get(cardId) || '');
        this.editingHora.set(cardId, false);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  // Cancela la edición de hora
  cancelHoraEdit(cardId: number): void {
    this.editingHora.set(cardId, false);
    this.horaInputs.delete(cardId);
    this.originalHora.delete(cardId);
  }
}
