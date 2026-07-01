import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Appointment, Patient } from '../../../core/models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientService } from '../../../core/services/patient.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { combineLatest, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PatientFormComponent, getPatientFormConfig } from '../../../shared';
import { fullName } from '../../../core/utils/full-name.util';

@Component({
  selector: 'app-seguimiento-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PatientFormComponent],
  templateUrl: './seguimiento-view.component.html',
  styleUrls: ['./seguimiento-view.component.scss']
})
export class SeguimientoViewComponent implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  patients: Patient[] = [];
  patientsMap: Map<string, Patient> = new Map();

  searchTerm = '';
  patientGroups: Array<{ patient: Patient; appointments: Appointment[]; totalAdeudado: number }> = [];

  // Formulario cliente (crear/editar) - columna derecha
  patientForm!: FormGroup;
  selectedPatientForForm: Patient | null = null;
  isSavingPatient = false;
  patientFormError = '';

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
    private fb: FormBuilder,
    private appointmentsService: AppointmentsService,
    private patientService: PatientService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private whatsappConfig: ConfigurationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    document.documentElement.classList.add('seguimiento-view-active');
    this.patientForm = this.fb.group(getPatientFormConfig(this.fb));

    this.subscriptions.add(
      combineLatest([
        this.appointmentsService.getAppointments(),
        this.patientService.getPatients()
      ]).subscribe({
        next: ([appointments, patients]) => {
          this.appointments = appointments;
          this.patients = patients;

          this.patientsMap = new Map();
          patients.forEach(patient => {
            if (patient.dni) {
              this.patientsMap.set(patient.dni, patient);
            }
          });

          this.updatePatientGroups();
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading data:', err);
          if (err.status !== 404) {
            const message = this.errorHandler.getErrorMessage(err, 'cargar los datos');
            if (!this.errorHandler.isNetworkError(err)) {
              this.notification.showError(message);
            }
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('seguimiento-view-active');
    this.subscriptions.unsubscribe();
  }

  private updatePatientGroups(): void {
    const term = this.searchTerm.toLowerCase().trim();

    const filteredPatients = term
      ? this.patients.filter(p =>
          fullName(p.nombre, p.apellido).toLowerCase().includes(term) ||
          (p.dni || '').includes(term) ||
          (p.email || '').toLowerCase().includes(term)
        )
      : this.patients;

    this.patientGroups = filteredPatients.map(patient => {
      const patientApps = this.appointments.filter(
        app => app.patientDni === patient.dni
      );
      const totalAdeudado = patientApps.reduce(
        (sum, app) => sum + (app.totalPrecio && app.totalPrecio > 0 ? app.totalPrecio : 0), 0
      );
      return { patient, appointments: patientApps, totalAdeudado };
    });
  }

  onSearchChange(): void {
    // Solo actualizar cuando cambia el término de búsqueda
    this.updatePatientGroups();
  }

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  getPatientByDni(dni: string): Patient | undefined {
    return this.patientsMap.get(dni);
  }

  /** Cargar paciente en el formulario de la columna derecha (editar) */
  loadPatientIntoForm(patient: Patient): void {
    this.selectedPatientForForm = patient;
    let anamnesisData: Record<string, string> = {};
    if (patient.anamnesis) {
      try {
        anamnesisData = typeof patient.anamnesis === 'string' ? JSON.parse(patient.anamnesis) : patient.anamnesis;
      } catch {
        anamnesisData = {};
      }
    }
    this.patientForm.patchValue({
      nombre: patient.nombre,
      apellido: patient.apellido,
      fechaNacimiento: patient.fechaNacimiento || '',
      dni: patient.dni,
      telefono: patient.telefono || '',
      email: patient.email || '',
      domicilio: patient.domicilio || '',
      localidad: patient.localidad || '',
      contactoEmergencia: patient.contactoEmergencia || '',
      enfermedades: anamnesisData['enfermedades'] || '',
      alergias: anamnesisData['alergias'] || '',
      medicacion: anamnesisData['medicacion'] || '',
      cirugias: anamnesisData['cirugias'] || '',
      embarazo: anamnesisData['embarazo'] || '',
      marcapasos: anamnesisData['marcapasos'] || '',
      consumos: anamnesisData['consumos'] || '',
      obraSocialNombre: patient.obraSocialNombre || '',
      planCategoria: patient.planCategoria || '',
      obraSocialNumero: patient.obraSocialNumero || '',
      obraSocialVencimiento: patient.obraSocialVencimiento || '',
      esTitular: (patient.obraSocialNombre === 'Particular' || patient.esTitular) ? 'si' : 'no',
      nombreTitular: patient.nombreTitular || '',
      dniTitular: patient.dniTitular || '',
      parentesco: patient.parentesco || ''
    });
  }

  /** Selección desde el buscador del formulario compartido */
  onPatientFormSelect(patient: Patient): void {
    this.loadPatientIntoForm(patient);
  }

  /** Limpiar formulario y selección (nuevo paciente) */
  onClearPatientForm(): void {
    this.selectedPatientForForm = null;
    this.patientFormError = '';
    this.patientForm.reset({
      esTitular: 'si',
      enfermedades: '',
      alergias: '',
      medicacion: '',
      cirugias: '',
      embarazo: '',
      marcapasos: '',
      consumos: ''
    });
  }

  /** Editar paciente desde la tarjeta de la lista */
  editPatientFromGroup(group: { patient: Patient; appointments: Appointment[]; totalAdeudado: number }): void {
    this.loadPatientIntoForm(group.patient);
  }

  /** Guardar paciente (crear o actualizar) */
  savePatient(): void {
    this.trimPatientForm();
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }
    if (this.isSavingPatient) return;

    const raw = this.patientForm.getRawValue();
    const anamnesisData: Record<string, string> = {};
    if (raw.enfermedades) anamnesisData['enfermedades'] = raw.enfermedades;
    if (raw.alergias) anamnesisData['alergias'] = raw.alergias;
    if (raw.medicacion) anamnesisData['medicacion'] = raw.medicacion;
    if (raw.cirugias) anamnesisData['cirugias'] = raw.cirugias;
    if (raw.embarazo) anamnesisData['embarazo'] = raw.embarazo;
    if (raw.marcapasos) anamnesisData['marcapasos'] = raw.marcapasos;
    if (raw.consumos) anamnesisData['consumos'] = raw.consumos;
    const anamnesis = Object.keys(anamnesisData).length > 0 ? JSON.stringify(anamnesisData) : undefined;

    const patientData: Partial<Patient> = {
      id: this.selectedPatientForForm?.id,
      nombre: raw.nombre,
      apellido: raw.apellido,
      fechaNacimiento: raw.fechaNacimiento || undefined,
      dni: raw.dni,
      telefono: raw.telefono,
      email: raw.email,
      domicilio: raw.domicilio,
      localidad: raw.localidad,
      contactoEmergencia: raw.contactoEmergencia || undefined,
      anamnesis,
      obraSocialNombre: raw.obraSocialNombre,
      planCategoria: raw.planCategoria || undefined,
      obraSocialNumero: raw.obraSocialNumero || undefined,
      obraSocialVencimiento: raw.obraSocialVencimiento || undefined,
      esTitular: raw.esTitular === 'si',
      nombreTitular: raw.nombreTitular || undefined,
      dniTitular: raw.dniTitular || undefined,
      parentesco: raw.parentesco || undefined
    };

    this.isSavingPatient = true;
    this.patientFormError = '';

    const operation = this.selectedPatientForForm?.id
      ? this.patientService.update(this.selectedPatientForForm.id, patientData)
      : this.patientService.create(patientData as Patient, true);

    operation.pipe(finalize(() => { this.isSavingPatient = false; })).subscribe({
      next: (saved) => {
        this.notification.showSuccess(
          this.selectedPatientForForm?.id ? 'Paciente actualizado correctamente.' : 'Paciente creado correctamente.'
        );
        this.selectedPatientForForm = saved;
        this.loadPatientIntoForm(saved);
        this.onClearPatientForm();
      },
      error: (err) => {
        const msg = this.errorHandler.getErrorMessage(
          err,
          this.selectedPatientForForm?.id ? 'actualizar el paciente' : 'crear el paciente'
        );
        this.patientFormError = msg;
        if (!this.errorHandler.isNetworkError(err)) {
          this.notification.showError(msg);
        }
      }
    });
  }

  private trimPatientForm(): void {
    const fields = ['nombre', 'apellido', 'dni', 'telefono', 'email', 'domicilio', 'localidad'];
    fields.forEach(name => {
      const c = this.patientForm.get(name);
      if (c && typeof c.value === 'string') {
        const t = c.value.trim();
        if (t !== c.value) c.setValue(t);
      }
    });
  }

  getObraSocialInfo(dni: string): string {
    const patient = this.getPatientByDni(dni);
    if (!patient) return '';
    
    const parts: string[] = [];
    if (patient.obraSocialNombre) {
      parts.push(patient.obraSocialNombre);
    }
    if (patient.planCategoria) {
      parts.push(patient.planCategoria);
    }
    if (patient.obraSocialNumero) {
      parts.push(`(${patient.obraSocialNumero})`);
    }
    
    return parts.length > 0 ? parts.join(' ') : '';
  }

  getAppointmentColor(appointment: Appointment): string {
    const hasDebt = appointment.totalPrecio && appointment.totalPrecio > 0;
    const estado = appointment.estado || 'PENDIENTE';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appDate = new Date(appointment.fecha + 'T00:00:00');
    const isPast = appDate < today;

    // Rojo: turnos con deuda
    if (hasDebt) {
      return 'red';
    }

    // Verde: turnos completados/pagados sin deuda
    if (estado === 'COMPLETADO' || estado === 'CONFIRMADO') {
      return 'green';
    }

    // Naranja/Amarillo: turnos programados/confirmados sin deuda
    if (estado === 'PENDIENTE' || estado === 'EN_CURSO') {
      return 'orange';
    }

    // Gris: turnos cancelados, no asistió, o pasados sin deuda
    if (estado === 'CANCELADO' || estado === 'NO_ASISTIO' || isPast) {
      return 'gray';
    }

    return 'gray';
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount || amount === 0) return '';
    // Formato: $12.800 (punto como separador de miles)
    return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // --- Modal Pago y observaciones del turno ---

  hasPatientPhone(): boolean {
    if (!this.selectedAppointment) return false;
    const dni = this.selectedAppointment.patientDni;
    if (!dni) return false;
    const patient = this.patientsMap.get(dni);
    return !!(patient?.telefono);
  }

  getWhatsAppLink(): string | null {
    if (!this.selectedAppointment) return null;
    const dni = this.selectedAppointment.patientDni;
    if (!dni) return null;
    const patient = this.patientsMap.get(dni);
    if (!patient?.telefono) return null;
    const phone = patient.telefono.replace(/[\s\-\(\)\+]/g, '');
    const horaStr = this.selectedAppointment.hora
      ? this.selectedAppointment.hora.substring(0, 5)
      : '';
    const fechaStr = this.formatDate(this.selectedAppointment.fecha);
    const doctor = fullName(this.selectedAppointment.profesionalNombre, this.selectedAppointment.profesionalApellido) || 'sin asignar';
    const paciente = fullName(patient.nombre, patient.apellido) || fullName(this.selectedAppointment.patientNombre, this.selectedAppointment.patientApellido);
    const message = this.whatsappConfig.buildMessage(horaStr, fechaStr, doctor, paciente);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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
    this.appointments = this.appointments.map(a => a.id === updated.id ? updated : a);
    this.selectedAppointment = { ...updated };
    this.updatePatientGroups();
    this.cdr.markForCheck();
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
