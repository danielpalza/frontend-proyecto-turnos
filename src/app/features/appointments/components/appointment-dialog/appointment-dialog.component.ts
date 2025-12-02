import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Patient, Profesional, AppointmentCreateDTO } from '../../../../core/models';

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-dialog.component.html',
  styleUrls: ['./appointment-dialog.component.scss']
})
export class AppointmentDialogComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() selectedDate: string | null = null;
  @Input() existingPatients: Patient[] = [];
  @Input() profesionales: Profesional[] = [];
  @Input() isLoading = false;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() submitForm = new EventEmitter<{ patientData: Partial<Patient>; appointmentData: AppointmentCreateDTO }>();

  form!: FormGroup;
  selectedPatient: Patient | null = null;
  isNewPatient = true;
  filteredPatients: Patient[] = [];
  showPatientDropdown = false;

  // Obras sociales
  OBRAS_SOCIALES = [
    'Particular','OSDEPYM','PAMI','OSPAT','OSPE','OSDE','OSDOP','OSPJN','OSMATA','OSPRERA','OSSEG',
    'OSDIPP','OSPAP','OSPECON','OSPERYHRA','OSPM','OSPT','OSPRA','OSECAC','UOM Salud','OSEIV','OSMITA',
    'OSPDH','OSPIF','OSPED','OSPIT','OSPF','OSPTR','UOM','UOCRA Salud','OSCHOCA (Camioneros)','UTEDYC',
    'OSPEDYC','OSPIM','OSPLAD','SUTEBA','FEB','AMET','OSPSA (Sanidad)','OSPAGA','OSPACP','OSPAC (Aeronavegantes)',
    'OSPIL','OSFE','OSPIA','OSUOMRA','OSPPRA','OSBA (Bancaria)','OSUTHGRA','Swiss Medical','Medicus','Galeno',
    'Omint','Sancor Salud','Hominis','Avalian','Prevención Salud','Hospital Italiano Plan de Salud','Accord Salud',
    'Medifé','Boreal Salud','ACA Salud','AMEBPBA','Staff Médico','IOMA','OSEP','IPROSS','ISSN','IOSCOR','APROSS',
    'ISJ','SEROS','DOSEP','OSPTDF','OSEPJ','IAPOS','ISSSyP','IPS Misiones','IPS Salta'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingPatients']) {
      this.filteredPatients = this.existingPatients;
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      // Datos Personales del Paciente
      nombreApellido: ['', Validators.required],
      fechaNacimiento: [''],
      edad: [{ value: '', disabled: true }],
      dni: ['', Validators.required],
      telefono: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      domicilio: ['', Validators.required],
      localidad: ['', Validators.required],
      contactoEmergencia: [''],
      anamnesis: [''],
      // Cobertura
      obraSocialNombre: ['', Validators.required],
      planCategoria: [''],
      obraSocialNumero: [''],
      esTitular: ['si'],
      nombreTitular: [''],
      dniTitular: [''],
      parentesco: [''],
      // Turno
      profesionalId: [''],
      hora: ['09:00'],
      // Pago
      precioBono: [0],
      precioTratamiento: [0],
      extras: [0],
      montoPago: [0],
      observaciones: ['']
    });

    // Calcular edad a partir de fechaNacimiento
    this.form.get('fechaNacimiento')?.valueChanges.subscribe((val: string) => {
      if (val) {
        const birthDate = new Date(val);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        this.form.get('edad')?.setValue(age.toString(), { emitEvent: false });
      }
    });

    // Validaciones condicionales para titular
    this.form.get('esTitular')?.valueChanges.subscribe((val: string) => {
      const nombreTitular = this.form.get('nombreTitular')!;
      const dniTitular = this.form.get('dniTitular')!;
      const parentesco = this.form.get('parentesco')!;

      if (val === 'no') {
        nombreTitular.setValidators([Validators.required]);
        dniTitular.setValidators([Validators.required]);
        parentesco.setValidators([Validators.required]);
      } else {
        nombreTitular.clearValidators();
        dniTitular.clearValidators();
        parentesco.clearValidators();
      }
      nombreTitular.updateValueAndValidity();
      dniTitular.updateValueAndValidity();
      parentesco.updateValueAndValidity();
    });
  }

  /**
   * Buscar pacientes mientras escribe
   */
  onSearchPatient(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    if (value.length >= 2) {
      this.filteredPatients = this.existingPatients.filter(p =>
        p.nombreApellido.toLowerCase().includes(value) ||
        p.dni.includes(value) ||
        (p.email && p.email.toLowerCase().includes(value))
      );
      this.showPatientDropdown = true;
    } else {
      this.filteredPatients = [];
      this.showPatientDropdown = false;
    }
    this.isNewPatient = true;
    this.selectedPatient = null;
  }

  /**
   * Seleccionar paciente existente
   */
  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.isNewPatient = false;
    this.showPatientDropdown = false;
    
    // Llenar el formulario con los datos del paciente
    this.form.patchValue({
      nombreApellido: patient.nombreApellido,
      fechaNacimiento: patient.fechaNacimiento || '',
      dni: patient.dni,
      telefono: patient.telefono || '',
      email: patient.email || '',
      domicilio: patient.domicilio || '',
      localidad: patient.localidad || '',
      contactoEmergencia: patient.contactoEmergencia || '',
      anamnesis: patient.anamnesis || '',
      obraSocialNombre: patient.obraSocialNombre || '',
      planCategoria: patient.planCategoria || '',
      obraSocialNumero: patient.obraSocialNumero || '',
      esTitular: patient.esTitular ? 'si' : 'no',
      nombreTitular: patient.nombreTitular || '',
      dniTitular: patient.dniTitular || '',
      parentesco: patient.parentesco || ''
    });
  }

  /**
   * Limpiar selección de paciente
   */
  clearPatientSelection(): void {
    this.selectedPatient = null;
    this.isNewPatient = true;
    this.form.reset({
      esTitular: 'si',
      hora: '09:00',
      precioBono: 0,
      precioTratamiento: 0,
      extras: 0,
      montoPago: 0
    });
  }

  close(): void {
    this.open = false;
    this.openChange.emit(false);
    this.clearPatientSelection();
  }

  calcularResto(): number {
    const bono = this.form.get('precioBono')?.value || 0;
    const tratamiento = this.form.get('precioTratamiento')?.value || 0;
    const extras = this.form.get('extras')?.value || 0;
    const pago = this.form.get('montoPago')?.value || 0;
    return (bono + tratamiento + extras) - pago;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    // Datos del paciente
    const patientData: Partial<Patient> = {
      id: this.selectedPatient?.id,
      nombreApellido: raw.nombreApellido,
      fechaNacimiento: raw.fechaNacimiento || undefined,
      dni: raw.dni,
      telefono: raw.telefono,
      email: raw.email,
      domicilio: raw.domicilio,
      localidad: raw.localidad,
      contactoEmergencia: raw.contactoEmergencia || undefined,
      anamnesis: raw.anamnesis || undefined,
      obraSocialNombre: raw.obraSocialNombre,
      planCategoria: raw.planCategoria || undefined,
      obraSocialNumero: raw.obraSocialNumero || undefined,
      esTitular: raw.esTitular === 'si',
      nombreTitular: raw.nombreTitular || undefined,
      dniTitular: raw.dniTitular || undefined,
      parentesco: raw.parentesco || undefined
    };

    // Datos del turno
    const appointmentData: AppointmentCreateDTO = {
      patientId: this.selectedPatient?.id || 0, // Se actualizará si es paciente nuevo
      profesionalId: raw.profesionalId ? Number(raw.profesionalId) : undefined,
      fecha: this.selectedDate || '',
      hora: raw.hora ? `${raw.hora}:00` : undefined,
      estado: 'PENDIENTE',
      precioBono: raw.precioBono || 0,
      precioTratamiento: raw.precioTratamiento || 0,
      extras: raw.extras || 0,
      montoPago: raw.montoPago || 0,
      observaciones: raw.observaciones || undefined
    };

    this.submitForm.emit({ patientData, appointmentData });
  }

  formatDisplayDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
