import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, Patient } from '../../../core/models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientService } from '../../../core/services/patient.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { combineLatest, Subscription } from 'rxjs';
import { fullName } from '../../../core/utils/full-name.util';
import { formatCurrency as formatCurrencyShared } from '../../../core/utils/currency.util';
import { ProfesionalesPanelComponent } from '../components/profesionales-panel/profesionales-panel.component';
import { AppointmentListOverflowComponent } from '../components/appointment-list-overflow/appointment-list-overflow.component';
import { PatientWizardPanelComponent } from '../components/patient-wizard-panel/patient-wizard-panel.component';
import { TurnPaymentModalComponent } from '../components/turn-payment-modal/turn-payment-modal.component';
import { PatientDataService, PatientGroup, MonthOption } from './patient-data.service';

@Component({
  selector: 'app-seguimiento-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfesionalesPanelComponent, AppointmentListOverflowComponent, PatientWizardPanelComponent, TurnPaymentModalComponent],
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

  private subscriptions = new Subscription();

  constructor(
    private appointmentsService: AppointmentsService,
    private patientService: PatientService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
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

  // --- Modal Pago y observaciones del turno ---

  get selectedAppointmentPatient(): Patient | undefined {
    const dni = this.selectedAppointment?.patientDni;
    return dni ? this.patientData.patientsMap.get(dni) : undefined;
  }

  openTurnModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showTurnModal = true;
  }

  closeTurnModal(): void {
    this.showTurnModal = false;
    this.selectedAppointment = null;
  }

  onAppointmentUpdated(updated: Appointment): void {
    this.patientData.updateCachedAppointment(updated);
    this.refreshResumenAndGroups();
  }
}
