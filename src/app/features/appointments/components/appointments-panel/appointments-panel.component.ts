import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Appointment, AppointmentPartialUpdateDTO, Profesional, Patient } from '../../../../core/models';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { ConfigurationService } from '../../../../core/services/configuration.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  filterProfesionalesForReassign,
  isProfesionalAssignableForReassign
} from '../../../../core/utils/profesional-assignability.util';
import { fullName } from '../../../../core/utils/full-name.util';

@Component({
  selector: 'app-appointments-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments-panel.component.html',
  styleUrls: ['./appointments-panel.component.scss']
})
export class AppointmentsPanelComponent implements OnChanges {
  @Input() date: string | null = null;
  @Input() appointments: Appointment[] = [];
  @Input() profesionales: Profesional[] = [];
  @Input() patients: Patient[] = [];

  @Output() delete = new EventEmitter<string>();
  @Output() addClick = new EventEmitter<void>();

  private patientsById = new Map<string, Patient>();
  private patientsByDni = new Map<string, Patient>();

  constructor(
    private appointmentsService: AppointmentsService,
    private whatsappConfig: ConfigurationService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patients']) {
      this.rebuildPatientsMaps();
    }
    // Limpiar expandedCards y volver a la pestaña "Todos" cuando cambia la fecha
    if (changes['date'] && !changes['date'].firstChange) {
      this.expandedCardId = null;
      this.activeTab = 'todos';
    }
  }

  private rebuildPatientsMaps(): void {
    this.patientsById.clear();
    this.patientsByDni.clear();
    (this.patients || []).forEach(patient => {
      if (patient.id != null) {
        this.patientsById.set(patient.id, patient);
      }
      if (patient.dni) {
        this.patientsByDni.set(patient.dni, patient);
      }
    });
  }

  expandedCardId: string | null = null; // Turno actualmente expandido (solo uno a la vez)
  paymentInputs = new Map<string, number>(); // Rastrea los valores de pago por tarjeta
  editingPrices = new Map<string, boolean>(); // Rastrea qué precios están siendo editados (key: "cardId-priceType")
  priceInputs = new Map<string, number>(); // Rastrea los valores temporales de los inputs de precio (key: "cardId-priceType")
  originalPrices = new Map<string, number>(); // Guarda los valores originales antes de editar
  editingObservaciones = new Map<string, boolean>(); // Rastrea qué observaciones están siendo editadas
  observacionesInputs = new Map<string, string>(); // Rastrea los valores temporales de las observaciones
  originalObservaciones = new Map<string, string>(); // Guarda los valores originales antes de editar
  editingObservacionesTurno = new Map<string, boolean>(); // Rastrea qué observaciones del turno están siendo editadas
  observacionesTurnoInputs = new Map<string, string>(); // Rastrea los valores temporales de las observaciones del turno
  originalObservacionesTurno = new Map<string, string>(); // Guarda los valores originales antes de editar
  editingHora = new Map<string, boolean>(); // Rastrea qué horas están siendo editadas
  horaInputs = new Map<string, string>(); // Rastrea los valores temporales de las horas
  originalHora = new Map<string, string>(); // Guarda los valores originales antes de editar
  editingProfesional = new Map<string, boolean>(); // Rastrea qué profesionales están siendo editados
  profesionalInputs = new Map<string, string | null>(); // profesionalId seleccionado (null = sin asignar)
  originalProfesionalId = new Map<string, string | undefined>(); // Guarda el valor original

  trackByAppointment(_index: number, appointment: Appointment): string {
    return appointment.id!;
  }

  get displayAppointments(): Appointment[] {
    return this.appointments || [];
  }

  // ---- Pestañas de estado (Todos / Completado / Pendientes / Cancelados) ----
  activeTab: 'todos' | 'completado' | 'pendiente' | 'cancelado' = 'todos';

  private isCompletado(a: Appointment): boolean {
    return a.estado === 'COMPLETADO';
  }

  private isPendiente(a: Appointment): boolean {
    return a.estado === 'PENDIENTE';
  }

  private isCancelado(a: Appointment): boolean {
    return a.estado === 'CANCELADO' || a.estado === 'NO_ASISTIO';
  }

  setActiveTab(tab: 'todos' | 'completado' | 'pendiente' | 'cancelado'): void {
    this.activeTab = tab;
  }

  get completadosCount(): number {
    return this.displayAppointments.filter(a => this.isCompletado(a)).length;
  }

  get pendientesCount(): number {
    return this.displayAppointments.filter(a => this.isPendiente(a)).length;
  }

  get canceladosCount(): number {
    return this.displayAppointments.filter(a => this.isCancelado(a)).length;
  }

  get filteredAppointments(): Appointment[] {
    let result: Appointment[];
    switch (this.activeTab) {
      case 'completado': result = this.displayAppointments.filter(a => this.isCompletado(a)); break;
      case 'pendiente': result = this.displayAppointments.filter(a => this.isPendiente(a)); break;
      case 'cancelado': result = this.displayAppointments.filter(a => this.isCancelado(a)); break;
      default: result = this.displayAppointments;
    }
    return [...result].sort((a, b) => {
      if (!a.hora) return 1;
      if (!b.hora) return -1;
      return a.hora.localeCompare(b.hora);
    });
  }

  /** Precio total del turno (bono + tratamiento + extras), independiente de lo pagado. */
  totalPrecio(a: Appointment): number {
    return (a.precioBono ?? 0) + (a.precioTratamiento ?? 0) + (a.extras ?? 0);
  }

  /** Iniciales del paciente para el avatar (ej. "Juan Pérez" -> "JP"). */
  getInitials(nombre?: string | null, apellido?: string | null): string {
    const first = (nombre || '').trim().charAt(0);
    const last = (apellido || '').trim().charAt(0);
    return (first + last).toUpperCase() || '?';
  }

  private static readonly AVATAR_PALETTE = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5'];

  /** Clase de color pastel para el avatar, determinística por paciente (mismo paciente = mismo color). */
  getAvatarColorClass(a: Appointment): string {
    const key = a.patientId || a.patientDni || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash + key.charCodeAt(i)) % AppointmentsPanelComponent.AVATAR_PALETTE.length;
    }
    return AppointmentsPanelComponent.AVATAR_PALETTE[hash];
  }

  /** Clase de color del punto indicador de estado (mismo criterio semántico que los badges). */
  getStatusDotClass(status: string | undefined): string {
    switch (status) {
      case 'COMPLETADO': return 'dot-completado';
      case 'CONFIRMADO':
      case 'EN_CURSO': return 'dot-en-curso';
      case 'PENDIENTE': return 'dot-pendiente';
      case 'CANCELADO':
      case 'NO_ASISTIO': return 'dot-cancelado';
      default: return 'dot-sin-estado';
    }
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
      case 'CONFIRMADO': return 'badge-confirmado';
      case 'PENDIENTE': return 'badge-pendiente';
      case 'EN_CURSO': return 'badge-en-curso';
      case 'COMPLETADO': return 'badge-completado';
      case 'CANCELADO': return 'badge-cancelado';
      case 'NO_ASISTIO': return 'badge-no-asistio';
      default: return 'badge-sin-estado';
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

  // Toggle del estado expandido/colapsado de una tarjeta
  toggleCard(cardId: string, event: Event): void {
    event.stopPropagation();
    this.expandedCardId = this.expandedCardId === cardId ? null : cardId;
  }

  // Verifica si una tarjeta está expandida
  isCardExpanded(cardId: string): boolean {
    return this.expandedCardId === cardId;
  }

  // Obtiene el valor del input de pago para una tarjeta
  getPaymentInput(cardId: string): number {
    return this.paymentInputs.get(cardId) || 0;
  }

  // Actualiza el valor del input de pago
  updatePaymentInput(cardId: string, value: number): void {
    this.paymentInputs.set(cardId, value);
  }

  // Agrega el pago a un turno (usa lógica compartida del servicio)
  onAddPayment(cardId: string): void {
    const paymentValue = this.paymentInputs.get(cardId) || 0;
    this.appointmentsService.addPaymentWithFeedback(cardId, paymentValue).subscribe({
      next: () => this.paymentInputs.set(cardId, 0),
      error: () => { /* notificación ya mostrada por el servicio */ }
    });
  }

  // Inicia la edición de un precio
  startEditingPrice(cardId: string, priceType: 'bono' | 'tratamiento' | 'extras', currentValue?: number): void {
    const key = `${cardId}-${priceType}`;
    this.editingPrices.set(key, true);
    this.priceInputs.set(key, currentValue || 0);
    this.originalPrices.set(key, currentValue || 0);
  }

  // Verifica si un precio está siendo editado
  isEditingPrice(cardId: string, priceType: 'bono' | 'tratamiento' | 'extras'): boolean {
    const key = `${cardId}-${priceType}`;
    return this.editingPrices.get(key) || false;
  }

  // Obtiene el valor del input de precio
  getPriceInput(cardId: string, priceType: 'bono' | 'tratamiento' | 'extras'): number {
    const key = `${cardId}-${priceType}`;
    return this.priceInputs.get(key) || 0;
  }

  // Actualiza el valor del input de precio
  updatePriceInput(cardId: string, priceType: 'bono' | 'tratamiento' | 'extras', value: number): void {
    const key = `${cardId}-${priceType}`;
    this.priceInputs.set(key, value);
  }

  // Guarda el precio editado (usa lógica compartida del servicio)
  savePrice(cardId: string, priceType: 'bono' | 'tratamiento' | 'extras'): void {
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
  cancelPriceEdit(cardId: string, priceType: 'bono' | 'tratamiento' | 'extras'): void {
    const key = `${cardId}-${priceType}`;
    this.editingPrices.set(key, false);
    this.priceInputs.delete(key);
    this.originalPrices.delete(key);
  }

  // Inicia la edición de observaciones
  startEditingObservaciones(cardId: string, currentValue?: string): void {
    this.editingObservaciones.set(cardId, true);
    this.observacionesInputs.set(cardId, currentValue || '');
    this.originalObservaciones.set(cardId, currentValue || '');
  }

  // Verifica si las observaciones están siendo editadas
  isEditingObservaciones(cardId: string): boolean {
    return this.editingObservaciones.get(cardId) || false;
  }

  // Obtiene el valor del input de observaciones
  getObservacionesInput(cardId: string): string {
    return this.observacionesInputs.get(cardId) || '';
  }

  // Actualiza el valor del input de observaciones
  updateObservacionesInput(cardId: string, value: string): void {
    this.observacionesInputs.set(cardId, value);
  }

  // Guarda las observaciones editadas (usa lógica compartida del servicio)
  saveObservaciones(cardId: string): void {
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
  cancelObservacionesEdit(cardId: string): void {
    this.editingObservaciones.set(cardId, false);
    this.observacionesInputs.delete(cardId);
    this.originalObservaciones.delete(cardId);
  }

  // Inicia la edición de observaciones del turno
  startEditingObservacionesTurno(cardId: string, currentValue?: string): void {
    this.editingObservacionesTurno.set(cardId, true);
    this.observacionesTurnoInputs.set(cardId, currentValue || '');
    this.originalObservacionesTurno.set(cardId, currentValue || '');
  }

  // Verifica si las observaciones del turno están siendo editadas
  isEditingObservacionesTurno(cardId: string): boolean {
    return this.editingObservacionesTurno.get(cardId) || false;
  }

  // Obtiene el valor del input de observaciones del turno
  getObservacionesTurnoInput(cardId: string): string {
    return this.observacionesTurnoInputs.get(cardId) || '';
  }

  // Actualiza el valor del input de observaciones del turno
  updateObservacionesTurnoInput(cardId: string, value: string): void {
    this.observacionesTurnoInputs.set(cardId, value);
  }

  // Guarda las observaciones del turno editadas (usa lógica compartida del servicio)
  saveObservacionesTurno(cardId: string): void {
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
  cancelObservacionesTurnoEdit(cardId: string): void {
    this.editingObservacionesTurno.set(cardId, false);
    this.observacionesTurnoInputs.delete(cardId);
    this.originalObservacionesTurno.delete(cardId);
  }

  // Inicia la edición de hora
  startEditingHora(cardId: string, currentValue?: string): void {
    this.editingHora.set(cardId, true);
    // Convertir formato HH:mm:ss a HH:mm para el input type="time"
    const horaValue = currentValue ? currentValue.substring(0, 5) : '';
    this.horaInputs.set(cardId, horaValue);
    this.originalHora.set(cardId, horaValue);
  }

  // Verifica si la hora está siendo editada
  isEditingHora(cardId: string): boolean {
    return this.editingHora.get(cardId) || false;
  }

  // Obtiene el valor del input de hora
  getHoraInput(cardId: string): string {
    return this.horaInputs.get(cardId) || '';
  }

  // Actualiza el valor del input de hora
  updateHoraInput(cardId: string, value: string): void {
    this.horaInputs.set(cardId, value);
  }

  // Guarda la hora editada
  saveHora(cardId: string): void {
    const newValue = this.horaInputs.get(cardId) || '';
    
    // Convertir formato HH:mm a HH:mm:ss para el backend.
    // Si está vacío, no enviamos el campo (no se soporta limpiar hora vía PATCH actual).
    const horaFormatted = newValue && newValue.trim() !== '' ? `${newValue}:00` : undefined;
    const updateData: AppointmentPartialUpdateDTO = {};
    if (horaFormatted) {
      updateData.hora = horaFormatted;
    }

    this.appointmentsService.updateWithFeedback(
      cardId,
      updateData,
      'Hora actualizada correctamente.',
      'actualizar la hora'
    ).subscribe({
      next: () => {
        this.editingHora.set(cardId, false);
        this.horaInputs.delete(cardId);
        this.originalHora.delete(cardId);
      },
      error: () => {
        this.horaInputs.set(cardId, this.originalHora.get(cardId) || '');
        this.editingHora.set(cardId, false);
      }
    });
  }

  // Cancela la edición de hora
  cancelHoraEdit(cardId: string): void {
    this.editingHora.set(cardId, false);
    this.horaInputs.delete(cardId);
    this.originalHora.delete(cardId);
  }

  /** Solo profesionales con estado "Disponible" para reasignar turnos. */
  get reassignableProfesionales(): Profesional[] {
    return filterProfesionalesForReassign(this.profesionales || []);
  }

  /**
   * Opciones del select al reasignar: Disponibles + el profesional actual si ya no lo es
   * (solo para conservar la asignación existente, no para elegirlo en turnos nuevos).
   */
  getProfesionalesForReassignSelect(appointment: Appointment): Profesional[] {
    const available = this.reassignableProfesionales;
    const currentId = appointment.profesionalId;
    if (!currentId || available.some(p => p.id === currentId)) {
      return available;
    }
    const current = (this.profesionales || []).find(p => p.id === currentId);
    return current ? [current, ...available] : available;
  }

  isCurrentAssignedProfesional(prof: Profesional, appointment: Appointment): boolean {
    return prof.id === appointment.profesionalId
      && !isProfesionalAssignableForReassign(prof);
  }

  startEditingProfesional(cardId: string, currentProfesionalId?: string): void {
    this.editingProfesional.set(cardId, true);
    this.profesionalInputs.set(cardId, currentProfesionalId ?? null);
    this.originalProfesionalId.set(cardId, currentProfesionalId);
  }

  isEditingProfesional(cardId: string): boolean {
    return this.editingProfesional.get(cardId) || false;
  }

  getProfesionalInput(cardId: string): string | null {
    const val = this.profesionalInputs.get(cardId);
    return val !== undefined ? val : null;
  }

  getProfesionalSelectValue(cardId: string): string {
    const val = this.profesionalInputs.get(cardId);
    return val == null ? '' : String(val);
  }

  updateProfesionalInput(cardId: string, value: string): void {
    this.updateProfesionalSelect(cardId, value);
  }

  updateProfesionalSelect(cardId: string, value: string | null): void {
    if (value === '' || value === null || value === undefined) {
      this.profesionalInputs.set(cardId, null);
      return;
    }
    this.profesionalInputs.set(cardId, value);
  }

  saveProfesional(cardId: string): void {
    const selectedId = this.profesionalInputs.get(cardId);
    const originalId = this.originalProfesionalId.get(cardId);

    if (selectedId === (originalId ?? null)) {
      this.cancelProfesionalEdit(cardId);
      return;
    }

    const updateData: { profesionalId?: string; unassignProfesional?: boolean } = {};

    if (selectedId === null || selectedId === undefined) {
      updateData.unassignProfesional = true;
    } else {
      const profesional = (this.profesionales || []).find(p => p.id === selectedId);
      if (!profesional || !isProfesionalAssignableForReassign(profesional)) {
        this.notification.showError(
          'Solo se pueden asignar profesionales con estado "Disponible".'
        );
        return;
      }
      updateData.profesionalId = selectedId;
    }

    this.appointmentsService.updateWithFeedback(
      cardId,
      updateData,
      selectedId == null ? 'Profesional desasignado correctamente.' : 'Profesional actualizado correctamente.',
      selectedId == null ? 'desasignar el profesional' : 'actualizar el profesional'
    ).subscribe({
      next: () => {
        this.editingProfesional.set(cardId, false);
        this.profesionalInputs.delete(cardId);
        this.originalProfesionalId.delete(cardId);
      },
      error: () => {
        this.profesionalInputs.set(cardId, this.originalProfesionalId.get(cardId) ?? null);
        this.editingProfesional.set(cardId, false);
      }
    });
  }

  cancelProfesionalEdit(cardId: string): void {
    this.editingProfesional.set(cardId, false);
    this.profesionalInputs.delete(cardId);
    this.originalProfesionalId.delete(cardId);
  }

  openOdontogram(appointmentId: string): void {
    this.router.navigate(['/odontograma', appointmentId]);
  }

  hasPatientPhone(appointment: Appointment): boolean {
    return !!this.getPatientForAppointment(appointment)?.telefono?.trim();
  }

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  getWhatsAppLink(appointment: Appointment): string | null {
    const patient = this.getPatientForAppointment(appointment);
    if (!patient?.telefono) return null;

    const horaStr = appointment.hora ? this.formatTime(appointment.hora) : '';
    const fechaStr = this.whatsappConfig.formatAppointmentDate(appointment.fecha);
    const doctor = fullName(appointment.profesionalNombre, appointment.profesionalApellido) || 'sin asignar';
    const paciente = fullName(patient.nombre, patient.apellido) || fullName(appointment.patientNombre, appointment.patientApellido);

    return this.whatsappConfig.buildWhatsAppLink(patient.telefono, {
      hora: horaStr,
      fecha: fechaStr,
      doctor,
      paciente
    });
  }

  private getPatientForAppointment(appointment: Appointment): Patient | undefined {
    if (appointment.patientId != null) {
      const byId = this.patientsById.get(appointment.patientId);
      if (byId) return byId;
    }
    if (appointment.patientDni) {
      return this.patientsByDni.get(appointment.patientDni);
    }
    return undefined;
  }
}
