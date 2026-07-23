import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Patient } from '../../../../core/models';
import { PatientService } from '../../../../core/services/patient.service';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { PatientWizardComponent, getPatientFormConfig } from '../../../../shared';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-patient-wizard-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PatientWizardComponent, ScrollLockDirective],
  templateUrl: './patient-wizard-panel.component.html',
  styleUrls: ['./patient-wizard-panel.component.scss']
})
export class PatientWizardPanelComponent implements OnInit {
  @Input() patients: Patient[] = [];

  patientForm!: FormGroup;
  selectedPatientForForm: Patient | null = null;
  isSavingPatient = false;
  patientFormError = '';
  isOpen = false;

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.patientForm = this.fb.group(getPatientFormConfig(this.fb));
  }

  /** Abrir el wizard con el formulario limpio (paciente nuevo) */
  openNew(): void {
    this.onClearPatientForm();
    this.isOpen = true;
  }

  /** Abrir el wizard precargado con un paciente existente */
  openEdit(patient: Patient): void {
    this.loadPatientIntoForm(patient);
    this.isOpen = true;
  }

  /** Cerrar el wizard y limpiar la selección */
  close(): void {
    this.isOpen = false;
    this.onClearPatientForm();
  }

  /** Selección desde el buscador del formulario compartido */
  onPatientFormSelect(patient: Patient): void {
    this.loadPatientIntoForm(patient);
  }

  /** Cargar paciente en el formulario (editar) */
  private loadPatientIntoForm(patient: Patient): void {
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
      identificacion: patient.identificacion,
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
      otrosAntecedentes: anamnesisData['otrosAntecedentes'] || '',
      coberturaNombre: patient.coberturaNombre || '',
      coberturaId: patient.coberturaId || '',
      planCategoria: patient.planCategoria || '',
      coberturaNumero: patient.coberturaNumero || '',
      coberturaVencimiento: patient.coberturaVencimiento || '',
      esTitular: (patient.coberturaNombre === 'Particular' || patient.esTitular) ? 'si' : 'no',
      nombreTitular: patient.nombreTitular || '',
      identificacionTitular: patient.identificacionTitular || '',
      parentesco: patient.parentesco || ''
    });
  }

  /** Limpiar formulario y selección (nuevo paciente) */
  private onClearPatientForm(): void {
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
      consumos: '',
      otrosAntecedentes: ''
    });
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
    if (raw.otrosAntecedentes) anamnesisData['otrosAntecedentes'] = raw.otrosAntecedentes;
    const anamnesis = Object.keys(anamnesisData).length > 0 ? JSON.stringify(anamnesisData) : undefined;

    const patientData: Partial<Patient> = {
      id: this.selectedPatientForForm?.id,
      nombre: raw.nombre,
      apellido: raw.apellido,
      fechaNacimiento: raw.fechaNacimiento || undefined,
      identificacion: raw.identificacion,
      telefono: raw.telefono,
      email: raw.email,
      domicilio: raw.domicilio,
      localidad: raw.localidad,
      contactoEmergencia: raw.contactoEmergencia || undefined,
      anamnesis,
      coberturaNombre: raw.coberturaNombre,
      coberturaId: raw.coberturaId || undefined,
      planCategoria: raw.planCategoria || undefined,
      coberturaNumero: raw.coberturaNumero || undefined,
      coberturaVencimiento: raw.coberturaVencimiento || undefined,
      esTitular: raw.esTitular === 'si',
      nombreTitular: raw.nombreTitular || undefined,
      identificacionTitular: raw.identificacionTitular || undefined,
      parentesco: raw.parentesco || undefined
    };

    this.isSavingPatient = true;
    this.patientFormError = '';

    const operation = this.selectedPatientForForm?.id
      ? this.patientService.update(this.selectedPatientForForm.id, patientData)
      : this.patientService.create(patientData as Patient, true);

    operation.pipe(finalize(() => { this.isSavingPatient = false; })).subscribe({
      next: () => {
        this.notification.showSuccess(
          this.selectedPatientForForm?.id ? 'Paciente actualizado correctamente.' : 'Paciente creado correctamente.'
        );
        this.close();
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
    const fields = ['nombre', 'apellido', 'identificacion', 'telefono', 'email', 'domicilio', 'localidad'];
    fields.forEach(name => {
      const c = this.patientForm.get(name);
      if (c && typeof c.value === 'string') {
        const t = c.value.trim();
        if (t !== c.value) c.setValue(t);
      }
    });
  }
}
