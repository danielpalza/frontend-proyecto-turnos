import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PatientComboboxComponent, Patient } from '../../../patients/components/patient-combobox/patient-combobox.component';
import { Appointment } from '../../models/appointment.model';

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PatientComboboxComponent],
  templateUrl: './appointment-dialog.component.html',
  styleUrls: ['./appointment-dialog.component.scss']
})
export class AppointmentDialogComponent implements OnInit {
  @Input() open = false;
  @Input() selectedDate: string | null = null;
  @Input() existingPatients: Array<{ nombreApellido: string; dni: string; email: string }> = [];

  @Output() openChange = new EventEmitter<boolean>();
  @Output() submitForm = new EventEmitter<Omit<Appointment, 'id' | 'date'>>();

  form!: FormGroup;

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
  ].map(os => ({ value: os, label: os }));

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // Datos Personales
      nombreApellido: ['', Validators.required],
      fechaNacimiento: [''],
      edad: [{ value: '', disabled: true }],
      dni: ['', Validators.required],
      telefono: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      domicilio: ['', Validators.required],
      localidad: ['', Validators.required],
      contactoEmergencia: ['', Validators.required],
      anamnesis: [''],
      // Cobertura
      obraSocialNombre: ['', Validators.required],
      planCategoria: ['', Validators.required],
      obraSocialNumero: ['', Validators.required],
      esTitular: ['si'],
      nombreTitular: [''],
      dniTitular: [''],
      parentesco: [''],
      // Profesional
      profesional: ['', Validators.required],
      // Pago
      precioBono: ['0'],
      precioTratamiento: ['0'],
      extras: ['0'],
      montoPago: ['0'],
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
      } else {
        this.form.get('edad')?.setValue('', { emitEvent: false });
      }
    });

    // Manejar validaciones condicionales para titular
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

  handlePatientSelect(patient: { nombreApellido: string; dni: string; email: string } | null) {
    if (patient) {
      this.form.patchValue({
        nombreApellido: patient.nombreApellido,
        dni: patient.dni,
        email: patient.email
      }, { emitEvent: false });
    }
  }

  close() {
    this.open = false;
    this.openChange.emit(false);
    this.form.reset({
      esTitular: 'si',
      precioBono: '0',
      precioTratamiento: '0',
      extras: '0',
      montoPago: '0'
    });
  }

  calcularResto(): string {
    const bono = parseFloat(this.form.get('precioBono')?.value || '0');
    const tratamiento = parseFloat(this.form.get('precioTratamiento')?.value || '0');
    const extras = parseFloat(this.form.get('extras')?.value || '0');
    const pago = parseFloat(this.form.get('montoPago')?.value || '0');
    const total = bono + tratamiento + extras;
    const resto = total - pago;
    return resto.toFixed(2);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = { ...this.form.getRawValue() };
    const payload: Omit<Appointment, 'id' | 'date'> = {
      ...raw,
      esTitular: raw.esTitular === 'si',
      edad: Number(raw.edad) || 0
    };

    this.submitForm.emit(payload);
    this.close();
  }

  formatDisplayDate(dateStr: string | null) {
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

