import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capability } from '../../../core/auth/capabilities';
import { CanDirective } from '../../../shared/directives/can.directive';
import { FormsModule } from '@angular/forms';
import { Appointment, Patient, SeguimientoPatientGroup, TipoEntidadDocumento } from '../../../core/models';
import { PatientService } from '../../../core/services/patient.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { fullName } from '../../../core/utils/full-name.util';
import { formatCurrency as formatCurrencyShared } from '../../../core/utils/currency.util';
import { formatDateToYYYYMMDD, getTodayAsYYYYMMDD } from '../../../core/utils/date.utils';
import { AppointmentListOverflowComponent } from '../components/appointment-list-overflow/appointment-list-overflow.component';
import { PatientWizardPanelComponent } from '../components/patient-wizard-panel/patient-wizard-panel.component';
import { TurnPaymentModalComponent } from '../components/turn-payment-modal/turn-payment-modal.component';
import { TurnClinicalModalComponent } from '../components/turn-clinical-modal/turn-clinical-modal.component';
import { DocumentosModalComponent } from '../../../shared/components/documentos-modal/documentos-modal.component';
import { MiniCalendarPickerComponent } from '../../../shared/components/mini-calendar-picker/mini-calendar-picker.component';
import { PatientDataService } from './patient-data.service';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_RANGE_DAYS = 30;

@Component({
  selector: 'app-seguimiento-view',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppointmentListOverflowComponent, PatientWizardPanelComponent,
    TurnPaymentModalComponent, TurnClinicalModalComponent, DocumentosModalComponent,
    MiniCalendarPickerComponent, CanDirective
  ],
  providers: [PatientDataService],
  templateUrl: './seguimiento-view.component.html',
  styleUrls: ['./seguimiento-view.component.scss']
})
export class SeguimientoViewComponent implements OnInit, OnDestroy {
  readonly Capability = Capability;

  /** Todos los pacientes de la organización — solo para el chequeo de duplicados del wizard, independiente de la página de Seguimiento. */
  patients: Patient[] = [];

  get patientGroups(): SeguimientoPatientGroup[] { return this.patientData.patientGroups; }
  get cargando(): boolean { return this.patientData.cargando; }
  get desde(): string { return this.patientData.desde; }
  get hasta(): string { return this.patientData.hasta; }
  get page(): number { return this.patientData.page; }
  get totalPages(): number { return this.patientData.totalPages; }
  get totalElements(): number { return this.patientData.totalElements; }

  get searchTerm(): string { return this.patientData.searchTerm; }
  set searchTerm(value: string) {
    this.patientData.searchTerm = value;
    this.searchChanged$.next(value);
  }

  @ViewChildren(AppointmentListOverflowComponent) appointmentLists!: QueryList<AppointmentListOverflowComponent>;
  @ViewChild(PatientWizardPanelComponent) wizardPanel!: PatientWizardPanelComponent;

  // Modal pago y observaciones del turno
  showTurnModal = false;
  // Modal resumen clínico del turno
  showClinicalModal = false;
  // Compartido por ambos modales: solo uno puede estar abierto a la vez.
  selectedAppointment: Appointment | null = null;

  private subscriptions = new Subscription();
  private readonly searchChanged$ = new Subject<string>();

  constructor(
    private patientService: PatientService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
    private patientData: PatientDataService
  ) {}

  ngOnInit(): void {
    document.documentElement.classList.add('seguimiento-view-active');

    this.patientData.desde = getTodayAsYYYYMMDD();
    this.patientData.hasta = this.addDays(new Date(), DEFAULT_RANGE_DAYS);

    // Lista completa de pacientes, solo para el chequeo de duplicados del wizard — independiente
    // de la página de Seguimiento (ver comentario en patient-data.service.ts).
    this.subscriptions.add(
      this.patientService.getPatients().subscribe({
        next: (list) => { this.patients = list; this.cdr.markForCheck(); }
      })
    );

    this.subscriptions.add(
      this.searchChanged$.pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged()).subscribe(() => {
        this.patientData.page = 0;
        this.fetchPage();
      })
    );

    this.fetchPage();
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('seguimiento-view-active');
    this.subscriptions.unsubscribe();
  }

  private fetchPage(): void {
    this.collapseAllAppointmentLists();
    this.subscriptions.add(
      this.patientData.loadPage().subscribe({
        next: () => this.cdr.markForCheck(),
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

  private collapseAllAppointmentLists(): void {
    this.appointmentLists?.forEach(list => list.collapse());
  }

  private addDays(date: Date, days: number): string {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return formatDateToYYYYMMDD(result);
  }

  // --- Filtro de rango de fechas (global, reemplaza los selects de año/mes por paciente) ---

  onDesdeChange(value: string): void {
    this.patientData.desde = value;
    this.patientData.page = 0;
    this.fetchPage();
  }

  onHastaChange(value: string): void {
    this.patientData.hasta = value;
    this.patientData.page = 0;
    this.fetchPage();
  }

  // --- Paginación ---

  goToPreviousPage(): void {
    if (this.patientData.page === 0) return;
    this.patientData.page--;
    this.fetchPage();
  }

  goToNextPage(): void {
    if (this.patientData.page + 1 >= this.patientData.totalPages) return;
    this.patientData.page++;
    this.fetchPage();
  }

  trackByPatientIdentificacion(_index: number, group: SeguimientoPatientGroup): string {
    return group.patient.identificacion;
  }

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  getPatientByIdentificacion(identificacion: string): Patient | undefined {
    return this.patientData.patientsMap.get(identificacion);
  }

  /** Editar paciente desde la tarjeta de la lista */
  editPatientFromGroup(group: SeguimientoPatientGroup): void {
    this.wizardPanel.openEdit(group.patient);
  }

  /** Abrir el wizard con el formulario limpio (paciente nuevo) */
  openNewPatientWizard(): void {
    this.wizardPanel.openNew();
  }

  /** El wizard emite `saved` al crear/actualizar con éxito — refresca la página actual. */
  onPatientSaved(): void {
    this.fetchPage();
  }

  getCoberturaInfo(identificacion: string): string {
    const patient = this.getPatientByIdentificacion(identificacion);
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
    const identificacion = this.selectedAppointment?.patientIdentificacion;
    return identificacion ? this.patientData.patientsMap.get(identificacion) : undefined;
  }

  openTurnModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showTurnModal = true;
  }

  closeTurnModal(): void {
    this.showTurnModal = false;
    this.selectedAppointment = null;
  }

  // --- Modal Resumen clínico del turno ---

  openClinicalModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showClinicalModal = true;
  }

  closeClinicalModal(): void {
    this.showClinicalModal = false;
    this.selectedAppointment = null;
  }

  // --- Modal Documentos (turno o paciente) ---

  showDocumentosModal = false;
  documentosTipoEntidad: TipoEntidadDocumento | null = null;
  documentosEntidadId: string | null = null;
  documentosTitulo = 'Documentos';

  openDocumentosModalTurno(appointment: Appointment): void {
    if (!appointment.id) return;
    this.documentosTipoEntidad = 'APPOINTMENT';
    this.documentosEntidadId = appointment.id;
    // Con la hora, no solo la fecha: un paciente puede tener más de un turno el mismo día.
    const hora = appointment.hora ? ` ${appointment.hora.substring(0, 5)}` : '';
    this.documentosTitulo = `Documentos del turno (${appointment.fecha}${hora})`;
    this.showDocumentosModal = true;
  }

  openDocumentosModalPaciente(patient: Patient): void {
    if (!patient.id) return;
    this.documentosTipoEntidad = 'PATIENT';
    this.documentosEntidadId = patient.id;
    this.documentosTitulo = `Documentos de ${fullName(patient.nombre, patient.apellido)}`;
    this.showDocumentosModal = true;
  }

  closeDocumentosModal(): void {
    this.showDocumentosModal = false;
    this.documentosTipoEntidad = null;
    this.documentosEntidadId = null;
  }

  onAppointmentUpdated(_updated: Appointment): void {
    this.fetchPage();
  }
}
