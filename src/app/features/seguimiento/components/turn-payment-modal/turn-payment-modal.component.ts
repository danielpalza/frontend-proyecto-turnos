import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, Patient } from '../../../../core/models';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { ConfigurationService } from '../../../../core/services/configuration.service';
import { fullName } from '../../../../core/utils/full-name.util';
import { formatCurrency as formatCurrencyShared } from '../../../../core/utils/currency.util';
import {
  formatDate as formatDateShared,
  getStatusBadgeClass as getStatusBadgeClassShared,
  getStatusLabel as getStatusLabelShared
} from '../../utils/seguimiento-display.util';

@Component({
  selector: 'app-turn-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turn-payment-modal.component.html',
  styleUrls: ['./turn-payment-modal.component.scss']
})
export class TurnPaymentModalComponent {
  @Input() open = false;
  @Input() patient: Patient | undefined;
  @Output() closed = new EventEmitter<void>();
  @Output() appointmentUpdated = new EventEmitter<Appointment>();

  private currentAppointment: Appointment | null = null;
  get appointment(): Appointment | null {
    return this.currentAppointment;
  }
  @Input() set appointment(value: Appointment | null) {
    if (!value) return;
    this.currentAppointment = { ...value };
    this.turnModalPaymentInput = 0;
    this.editingObservacionesPago = false;
    this.editingObservacionesTurno = false;
    this.observacionesPagoInput = value.observaciones ?? '';
    this.observacionesTurnoInput = value.observacionesTurno ?? '';
    this.editingPriceBono = false;
    this.editingPriceTratamiento = false;
    this.editingPriceExtras = false;
    this.inputBono = value.precioBono ?? 0;
    this.inputTratamiento = value.precioTratamiento ?? 0;
    this.inputExtras = value.extras ?? 0;
  }

  turnModalPaymentInput = 0;
  editingObservacionesPago = false;
  editingObservacionesTurno = false;
  observacionesPagoInput = '';
  observacionesTurnoInput = '';
  isAddingPayment = false;
  // Edición de montos (bono, tratamiento, extras)
  editingPriceBono = false;
  editingPriceTratamiento = false;
  editingPriceExtras = false;
  inputBono = 0;
  inputTratamiento = 0;
  inputExtras = 0;
  isSavingPrice = false;

  constructor(
    private appointmentsService: AppointmentsService,
    private whatsappConfig: ConfigurationService
  ) {}

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  formatDate(dateStr: string) {
    return formatDateShared(dateStr);
  }

  formatCurrency(amount: number | undefined): string {
    return formatCurrencyShared(amount);
  }

  getStatusBadgeClass(status: string | undefined): string {
    return getStatusBadgeClassShared(status);
  }

  getStatusLabel(status: string | undefined): string {
    return getStatusLabelShared(status);
  }

  close(): void {
    this.currentAppointment = null;
    this.turnModalPaymentInput = 0;
    this.editingObservacionesPago = false;
    this.editingObservacionesTurno = false;
    this.editingPriceBono = false;
    this.editingPriceTratamiento = false;
    this.editingPriceExtras = false;
    this.closed.emit();
  }

  hasPatientPhone(): boolean {
    return !!(this.patient?.telefono);
  }

  getWhatsAppLink(): string | null {
    if (!this.currentAppointment || !this.patient?.telefono) return null;
    const horaStr = this.currentAppointment.hora
      ? this.currentAppointment.hora.substring(0, 5)
      : '';
    const fechaStr = this.formatDate(this.currentAppointment.fecha);
    const profesional = fullName(this.currentAppointment.profesionalNombre, this.currentAppointment.profesionalApellido) || 'sin asignar';
    const paciente = fullName(this.patient.nombre, this.patient.apellido) || fullName(this.currentAppointment.patientNombre, this.currentAppointment.patientApellido);
    return this.whatsappConfig.buildWhatsAppLink(this.patient.telefono, { hora: horaStr, fecha: fechaStr, profesional, paciente });
  }

  getTurnModalPaymentInput(): number {
    return this.turnModalPaymentInput;
  }

  updateTurnModalPaymentInput(value: number): void {
    this.turnModalPaymentInput = value;
  }

  private syncUpdatedAppointment(updated: Appointment): void {
    this.currentAppointment = { ...updated };
    this.appointmentUpdated.emit(updated);
  }

  onTurnModalAddPayment(): void {
    if (!this.currentAppointment?.id) return;
    const monto = this.turnModalPaymentInput;
    this.isAddingPayment = true;
    this.appointmentsService.addPaymentWithFeedback(this.currentAppointment.id, monto).subscribe({
      next: (updated) => {
        this.syncUpdatedAppointment(updated);
        this.turnModalPaymentInput = 0;
        this.isAddingPayment = false;
      },
      error: () => {
        this.isAddingPayment = false;
      }
    });
  }

  // Montos: bono, tratamiento, extras
  startEditingPriceBono(): void {
    this.inputBono = this.currentAppointment?.precioBono ?? 0;
    this.editingPriceBono = true;
  }

  cancelEditingPriceBono(): void {
    this.editingPriceBono = false;
    this.inputBono = this.currentAppointment?.precioBono ?? 0;
  }

  savePriceBono(): void {
    if (!this.currentAppointment?.id) return;
    this.isSavingPrice = true;
    this.appointmentsService.updateWithFeedback(
      this.currentAppointment.id,
      { precioBono: this.inputBono },
      'Bono actualizado.',
      'actualizar el bono'
    ).subscribe({
      next: (updated) => {
        this.syncUpdatedAppointment(updated);
        this.editingPriceBono = false;
        this.isSavingPrice = false;
      },
      error: () => {
        this.isSavingPrice = false;
      }
    });
  }

  startEditingPriceTratamiento(): void {
    this.inputTratamiento = this.currentAppointment?.precioTratamiento ?? 0;
    this.editingPriceTratamiento = true;
  }

  cancelEditingPriceTratamiento(): void {
    this.editingPriceTratamiento = false;
    this.inputTratamiento = this.currentAppointment?.precioTratamiento ?? 0;
  }

  savePriceTratamiento(): void {
    if (!this.currentAppointment?.id) return;
    this.isSavingPrice = true;
    this.appointmentsService.updateWithFeedback(
      this.currentAppointment.id,
      { precioTratamiento: this.inputTratamiento },
      'Tratamiento actualizado.',
      'actualizar el tratamiento'
    ).subscribe({
      next: (updated) => {
        this.syncUpdatedAppointment(updated);
        this.editingPriceTratamiento = false;
        this.isSavingPrice = false;
      },
      error: () => {
        this.isSavingPrice = false;
      }
    });
  }

  startEditingPriceExtras(): void {
    this.inputExtras = this.currentAppointment?.extras ?? 0;
    this.editingPriceExtras = true;
  }

  cancelEditingPriceExtras(): void {
    this.editingPriceExtras = false;
    this.inputExtras = this.currentAppointment?.extras ?? 0;
  }

  savePriceExtras(): void {
    if (!this.currentAppointment?.id) return;
    this.isSavingPrice = true;
    this.appointmentsService.updateWithFeedback(
      this.currentAppointment.id,
      { extras: this.inputExtras },
      'Extras actualizados.',
      'actualizar los extras'
    ).subscribe({
      next: (updated) => {
        this.syncUpdatedAppointment(updated);
        this.editingPriceExtras = false;
        this.isSavingPrice = false;
      },
      error: () => {
        this.isSavingPrice = false;
      }
    });
  }

  startEditingObservacionesPago(): void {
    this.observacionesPagoInput = this.currentAppointment?.observaciones ?? '';
    this.editingObservacionesPago = true;
  }

  cancelEditingObservacionesPago(): void {
    this.editingObservacionesPago = false;
    this.observacionesPagoInput = this.currentAppointment?.observaciones ?? '';
  }

  saveObservacionesPago(): void {
    if (!this.currentAppointment?.id) return;
    this.appointmentsService.updateWithFeedback(
      this.currentAppointment.id,
      { observaciones: this.observacionesPagoInput },
      'Observaciones de pago guardadas.',
      'actualizar las observaciones'
    ).subscribe({
      next: (updated) => {
        this.syncUpdatedAppointment(updated);
        this.editingObservacionesPago = false;
      },
      error: () => { /* notificación ya mostrada por el servicio */ }
    });
  }

  startEditingObservacionesTurno(): void {
    this.observacionesTurnoInput = this.currentAppointment?.observacionesTurno ?? '';
    this.editingObservacionesTurno = true;
  }

  cancelEditingObservacionesTurno(): void {
    this.editingObservacionesTurno = false;
    this.observacionesTurnoInput = this.currentAppointment?.observacionesTurno ?? '';
  }

  saveObservacionesTurno(): void {
    if (!this.currentAppointment?.id) return;
    this.appointmentsService.updateWithFeedback(
      this.currentAppointment.id,
      { observacionesTurno: this.observacionesTurnoInput },
      'Observaciones del turno guardadas.',
      'actualizar las observaciones del turno'
    ).subscribe({
      next: (updated) => {
        this.syncUpdatedAppointment(updated);
        this.editingObservacionesTurno = false;
      },
      error: () => { /* notificación ya mostrada por el servicio */ }
    });
  }
}
