import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, Patient } from '../../../core/models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientService } from '../../../core/services/patient.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { combineLatest, Subscription } from 'rxjs';
import { fullName } from '../../../core/utils/full-name.util';
import { formatCurrency as formatCurrencyShared } from '../../../core/utils/currency.util';
import {
  formatDate as formatDateShared,
  getStatusBadgeClass as getStatusBadgeClassShared,
  getStatusLabel as getStatusLabelShared
} from '../utils/seguimiento-display.util';
import { ProfesionalesPanelComponent } from '../components/profesionales-panel/profesionales-panel.component';
import { AppointmentListOverflowComponent } from '../components/appointment-list-overflow/appointment-list-overflow.component';
import { PatientWizardPanelComponent } from '../components/patient-wizard-panel/patient-wizard-panel.component';
import { PatientDataService, PatientGroup, MonthOption } from './patient-data.service';

@Component({
  selector: 'app-seguimiento-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfesionalesPanelComponent, AppointmentListOverflowComponent, PatientWizardPanelComponent],
  providers: [PatientDataService],
  templateUrl: './seguimiento-view.component.html',
  styleUrls: ['./seguimiento-view.component.scss']
})
export class SeguimientoViewComponent implements OnInit, OnDestroy {
  get patients(): Patient[] { return this.patientData.patients; }
  get patientGroups(): PatientGroup[] { return this.patientData.patientGroups; }
  get searchTerm(): string { return this.patientData.searchTerm; }
  set searchTerm(value: string) { this.patientData.searchTerm = value; }

  @ViewChildren(AppointmentListOverflowComponent) appointmentLists!: QueryList<AppointmentListOverflowComponent>;
  @ViewChild(PatientWizardPanelComponent) wizardPanel!: PatientWizardPanelComponent;

  // Modal pago y observaciones del turno
  showTurnModal = false;
  selectedAppointment: Appointment | null = null;
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

  private subscriptions = new Subscription();

  constructor(
    private appointmentsService: AppointmentsService,
    private patientService: PatientService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private whatsappConfig: ConfigurationService,
    private cdr: ChangeDetectorRef,
    private patientData: PatientDataService
  ) {}

  ngOnInit(): void {
    document.documentElement.classList.add('seguimiento-view-active');

    this.subscriptions.add(
      combineLatest([
        this.appointmentsService.getSeguimientoResumen(),
        this.patientService.getPatients()
      ]).subscribe({
        next: ([resumen, patients]) => {
          this.patientData.setPatients(patients);
          this.patientData.setResumen(resumen);

          this.patientData.loadYear(this.patientData.currentYear()).subscribe({
            next: () => {
              this.patientData.updatePatientGroups();
              this.cdr.markForCheck();
            },
            error: (err) => this.handleLoadError(err)
          });
        },
        error: (err) => this.handleLoadError(err)
      })
    );
  }

  private handleLoadError(err: any): void {
    console.error('Error loading data:', err);
    if (err.status !== 404) {
      const message = this.errorHandler.getErrorMessage(err, 'cargar los datos');
      if (!this.errorHandler.isNetworkError(err)) {
        this.notification.showError(message);
      }
    }
  }

  private refreshResumenAndGroups(): void {
    this.patientData.refreshResumen().subscribe({
      next: () => this.cdr.markForCheck(),
      error: (err) => this.handleLoadError(err)
    });
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('seguimiento-view-active');
    this.subscriptions.unsubscribe();
  }

  getSelectedYear(dni?: string | null): string {
    return this.patientData.getSelectedYear(dni);
  }

  getSelectedMonth(dni?: string | null): string {
    return this.patientData.getSelectedMonth(dni);
  }

  onYearFilterChange(dni: string | undefined | null, value: string): void {
    if (!dni) return;
    this.collapseAppointmentList(dni);
    this.patientData.onYearFilterChange(dni, value).subscribe({
      next: () => {
        this.patientData.updatePatientGroups();
        this.cdr.markForCheck();
      },
      error: (err) => this.handleLoadError(err)
    });
  }

  onMonthFilterChange(dni: string | undefined | null, value: string): void {
    if (!dni) return;
    this.collapseAppointmentList(dni);
    this.patientData.onMonthFilterChange(dni, value);
  }

  /** Colapsa la lista de turnos expandida de un paciente (p.ej. al cambiar de año/mes). */
  private collapseAppointmentList(dni: string): void {
    this.appointmentLists?.find(list => list.dni === dni)?.collapse();
  }

  getAvailableMonths(dni?: string | null): MonthOption[] {
    return this.patientData.getAvailableMonths(dni);
  }

  getFilteredAppointments(group: PatientGroup): Appointment[] {
    return this.patientData.getFilteredAppointments(group);
  }

  onSearchChange(): void {
    // Solo actualizar cuando cambia el término de búsqueda
    this.patientData.updatePatientGroups();
  }

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  formatDate(dateStr: string) {
    return formatDateShared(dateStr);
  }

  getPatientByDni(dni: string): Patient | undefined {
    return this.patientData.patientsMap.get(dni);
  }

  /** Editar paciente desde la tarjeta de la lista */
  editPatientFromGroup(group: PatientGroup): void {
    this.wizardPanel.openEdit(group.patient);
  }

  /** Abrir el wizard con el formulario limpio (paciente nuevo) */
  openNewPatientWizard(): void {
    this.wizardPanel.openNew();
  }

  getCoberturaInfo(dni: string): string {
    const patient = this.getPatientByDni(dni);
    if (!patient) return '';
    
    const parts: string[] = [];
    if (patient.coberturaNombre) {
      parts.push(patient.coberturaNombre);
    }
    if (patient.planCategoria) {
      parts.push(patient.planCategoria);
    }
    if (patient.coberturaNumero) {
      parts.push(`(${patient.coberturaNumero})`);
    }
    
    return parts.length > 0 ? parts.join(' ') : '';
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

  // --- Modal Pago y observaciones del turno ---

  hasPatientPhone(): boolean {
    if (!this.selectedAppointment) return false;
    const dni = this.selectedAppointment.patientDni;
    if (!dni) return false;
    const patient = this.patientData.patientsMap.get(dni);
    return !!(patient?.telefono);
  }

  getWhatsAppLink(): string | null {
    if (!this.selectedAppointment) return null;
    const dni = this.selectedAppointment.patientDni;
    if (!dni) return null;
    const patient = this.patientData.patientsMap.get(dni);
    if (!patient?.telefono) return null;
    const horaStr = this.selectedAppointment.hora
      ? this.selectedAppointment.hora.substring(0, 5)
      : '';
    const fechaStr = this.formatDate(this.selectedAppointment.fecha);
    const profesional = fullName(this.selectedAppointment.profesionalNombre, this.selectedAppointment.profesionalApellido) || 'sin asignar';
    const paciente = fullName(patient.nombre, patient.apellido) || fullName(this.selectedAppointment.patientNombre, this.selectedAppointment.patientApellido);
    return this.whatsappConfig.buildWhatsAppLink(patient.telefono, { hora: horaStr, fecha: fechaStr, profesional, paciente });
  }

  openTurnModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.turnModalPaymentInput = 0;
    this.editingObservacionesPago = false;
    this.editingObservacionesTurno = false;
    this.observacionesPagoInput = appointment.observaciones ?? '';
    this.observacionesTurnoInput = appointment.observacionesTurno ?? '';
    this.editingPriceBono = false;
    this.editingPriceTratamiento = false;
    this.editingPriceExtras = false;
    this.inputBono = appointment.precioBono ?? 0;
    this.inputTratamiento = appointment.precioTratamiento ?? 0;
    this.inputExtras = appointment.extras ?? 0;
    this.showTurnModal = true;
  }

  closeTurnModal(): void {
    this.showTurnModal = false;
    this.selectedAppointment = null;
    this.turnModalPaymentInput = 0;
    this.editingObservacionesPago = false;
    this.editingObservacionesTurno = false;
    this.editingPriceBono = false;
    this.editingPriceTratamiento = false;
    this.editingPriceExtras = false;
  }

  getTurnModalPaymentInput(): number {
    return this.turnModalPaymentInput;
  }

  updateTurnModalPaymentInput(value: number): void {
    this.turnModalPaymentInput = value;
  }

  private syncUpdatedAppointment(updated: Appointment): void {
    this.patientData.updateCachedAppointment(updated);
    this.selectedAppointment = { ...updated };
    this.refreshResumenAndGroups();
  }

  onTurnModalAddPayment(): void {
    if (!this.selectedAppointment?.id) return;
    const monto = this.turnModalPaymentInput;
    this.isAddingPayment = true;
    this.appointmentsService.addPaymentWithFeedback(this.selectedAppointment.id, monto).subscribe({
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
    this.inputBono = this.selectedAppointment?.precioBono ?? 0;
    this.editingPriceBono = true;
  }

  cancelEditingPriceBono(): void {
    this.editingPriceBono = false;
    this.inputBono = this.selectedAppointment?.precioBono ?? 0;
  }

  savePriceBono(): void {
    if (!this.selectedAppointment?.id) return;
    this.isSavingPrice = true;
    this.appointmentsService.updateWithFeedback(
      this.selectedAppointment.id,
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
    this.inputTratamiento = this.selectedAppointment?.precioTratamiento ?? 0;
    this.editingPriceTratamiento = true;
  }

  cancelEditingPriceTratamiento(): void {
    this.editingPriceTratamiento = false;
    this.inputTratamiento = this.selectedAppointment?.precioTratamiento ?? 0;
  }

  savePriceTratamiento(): void {
    if (!this.selectedAppointment?.id) return;
    this.isSavingPrice = true;
    this.appointmentsService.updateWithFeedback(
      this.selectedAppointment.id,
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
    this.inputExtras = this.selectedAppointment?.extras ?? 0;
    this.editingPriceExtras = true;
  }

  cancelEditingPriceExtras(): void {
    this.editingPriceExtras = false;
    this.inputExtras = this.selectedAppointment?.extras ?? 0;
  }

  savePriceExtras(): void {
    if (!this.selectedAppointment?.id) return;
    this.isSavingPrice = true;
    this.appointmentsService.updateWithFeedback(
      this.selectedAppointment.id,
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
    this.observacionesPagoInput = this.selectedAppointment?.observaciones ?? '';
    this.editingObservacionesPago = true;
  }

  cancelEditingObservacionesPago(): void {
    this.editingObservacionesPago = false;
    this.observacionesPagoInput = this.selectedAppointment?.observaciones ?? '';
  }

  saveObservacionesPago(): void {
    if (!this.selectedAppointment?.id) return;
    this.appointmentsService.updateWithFeedback(
      this.selectedAppointment.id,
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
    this.observacionesTurnoInput = this.selectedAppointment?.observacionesTurno ?? '';
    this.editingObservacionesTurno = true;
  }

  cancelEditingObservacionesTurno(): void {
    this.editingObservacionesTurno = false;
    this.observacionesTurnoInput = this.selectedAppointment?.observacionesTurno ?? '';
  }

  saveObservacionesTurno(): void {
    if (!this.selectedAppointment?.id) return;
    this.appointmentsService.updateWithFeedback(
      this.selectedAppointment.id,
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
