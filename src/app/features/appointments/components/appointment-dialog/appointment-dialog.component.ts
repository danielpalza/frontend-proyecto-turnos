import { Component, EventEmitter, Input, OnInit, OnChanges, OnDestroy, Output, SimpleChanges, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Patient, Profesional, AppointmentCreateDTO } from '../../../../core/models';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { PatientWizardComponent, getPatientFormConfig } from '../../../../shared';

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PatientWizardComponent],
  templateUrl: './appointment-dialog.component.html',
  styleUrls: ['./appointment-dialog.component.scss']
})
export class AppointmentDialogComponent implements OnInit, OnChanges, OnDestroy {
  /** Máximo admitido por la columna numeric(10,2) en la base de datos */
  private static readonly MAX_MONTO = 99999999.99;

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
  showPatientDropdown = false;

  private readonly PATIENT_FIELDS = [
    'nombre', 'apellido', 'fechaNacimiento', 'edad', 'identificacion', 'telefono', 'email',
    'domicilio', 'localidad', 'contactoEmergencia',
    'enfermedades', 'alergias', 'medicacion', 'cirugias', 'embarazo', 'marcapasos', 'consumos', 'otrosAntecedentes',
    'coberturaNombre', 'coberturaId', 'planCategoria', 'coberturaNumero', 'coberturaVencimiento',
    'esTitular', 'nombreTitular', 'identificacionTitular', 'parentesco'
  ];
  isCheckingAvailability = false;
  availabilityError: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder, 
    private elRef: ElementRef,
    private appointmentsService: AppointmentsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupHoraAvailabilityValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cuando el diálogo se cierra para limpiar el formulario
    // Esto asegura que el formulario se limpie incluso cuando se cierra desde el componente padre
    if (changes['open'] && !changes['open'].currentValue && changes['open'].previousValue) {
      // Se cerró el diálogo (cambió de true a false)
      this.clearPatientSelection();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      ...getPatientFormConfig(this.fb),
      profesionalId: [''],
      hora: ['09:00'],
      observacionesTurno: [''],
      precioBono: [null, [Validators.min(0), Validators.max(AppointmentDialogComponent.MAX_MONTO)]],
      precioTratamiento: [null, [Validators.min(0), Validators.max(AppointmentDialogComponent.MAX_MONTO)]],
      extras: [null, [Validators.min(0), Validators.max(AppointmentDialogComponent.MAX_MONTO)]],
      montoPago: [null, [Validators.min(0), Validators.max(AppointmentDialogComponent.MAX_MONTO)]],
      observaciones: ['']
    });
  }

  private setPatientFieldsEnabled(enabled: boolean): void {
    this.PATIENT_FIELDS.forEach(field => {
      const control = this.form.get(field);
      if (!control) return;
      enabled ? control.enable({ emitEvent: false }) : control.disable({ emitEvent: false });
    });
  }

  /**
   * Seleccionar paciente existente
   */
  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.isNewPatient = false;
    this.showPatientDropdown = false;
    
    // Parsear anamnesis si existe (puede ser JSON o string)
    let anamnesisData: any = {};
    if (patient.anamnesis) {
      try {
        anamnesisData = typeof patient.anamnesis === 'string' ? JSON.parse(patient.anamnesis) : patient.anamnesis;
      } catch {
        // Si no es JSON válido, tratar como string vacío
        anamnesisData = {};
      }
    }
    
    // Llenar el formulario con los datos del paciente
    this.form.patchValue({
      nombre: patient.nombre,
      apellido: patient.apellido,
      fechaNacimiento: patient.fechaNacimiento || '',
      identificacion: patient.identificacion,
      telefono: patient.telefono || '',
      email: patient.email || '',
      domicilio: patient.domicilio || '',
      localidad: patient.localidad || '',
      contactoEmergencia: patient.contactoEmergencia || '',
      enfermedades: anamnesisData.enfermedades || '',
      alergias: anamnesisData.alergias || '',
      medicacion: anamnesisData.medicacion || '',
      cirugias: anamnesisData.cirugias || '',
      embarazo: anamnesisData.embarazo || '',
      marcapasos: anamnesisData.marcapasos || '',
      consumos: anamnesisData.consumos || '',
      otrosAntecedentes: anamnesisData.otrosAntecedentes || '',
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
    this.setPatientFieldsEnabled(false);
  }

  /**
   * Limpiar selección de paciente
   */
  clearPatientSelection(): void {
    this.selectedPatient = null;
    this.isNewPatient = true;
    this.setPatientFieldsEnabled(true);
    this.form.reset({
      esTitular: 'si',
      hora: '09:00',
      precioBono: null,
      precioTratamiento: null,
      extras: null,
      montoPago: null,
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

  close(): void {
    if (this.isLoading) return;
    this.open = false;
    this.openChange.emit(false);
    this.clearPatientSelection();
  }

  /**
   * Parsea un valor a número de forma segura
   * Maneja null, undefined, NaN, Infinity, valores negativos
   * y retorna 0 como valor por defecto seguro
   */
  private parseAmount(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const num = Number(value);
    
    // Validar que sea un número válido
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      console.warn('Valor inválido para monto:', value);
      return 0;
    }
    
    // Validar que no sea negativo
    if (num < 0) {
      console.warn('Valor negativo para monto:', value);
      return 0;
    }
    
    return num;
  }

  calcularResto(): number {
    const bono = this.parseAmount(this.form.get('precioBono')?.value);
    const tratamiento = this.parseAmount(this.form.get('precioTratamiento')?.value);
    const extras = this.parseAmount(this.form.get('extras')?.value);
    const pago = this.parseAmount(this.form.get('montoPago')?.value);
    
    const resultado = (bono + tratamiento + extras) - pago;

    // Validar que el resultado sea un número finito
    if (!Number.isFinite(resultado)) {
      return 0;
    }

    // Si el resto a pagar es negativo (se pagó de más), se muestra como 0
    return Math.max(0, resultado);
  }

  /**
   * Normaliza el formato de hora a HH:mm:ss
   * Maneja diferentes formatos de entrada (HH:mm, HH:mm:ss, etc.)
   * y los normaliza a HH:mm:ss para el backend
   */
  private normalizeTime(time: string | null | undefined): string | undefined {
    if (!time) return undefined;
    
    // Validar formato HH:mm o HH:mm:ss usando regex
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:([0-5][0-9]))?$/;
    
    if (!timeRegex.test(time)) {
      console.warn('Formato de hora inválido:', time);
      return undefined;
    }
    
    // Si tiene formato HH:mm (5 caracteres), agregar :00
    if (time.length === 5) {
      return `${time}:00`;
    }
    
    // Si ya tiene formato HH:mm:ss (8 caracteres), extraer solo HH:mm y agregar :00
    // Esto previene formatos como HH:mm:ss:00 si se concatenaba dos veces
    if (time.length >= 8) {
      return `${time.substring(0, 5)}:00`;
    }
    
    // Si el formato es inesperado, retornar undefined
    return undefined;
  }

  /**
   * Configura la validación de disponibilidad cada vez que cambia la hora
   */
  private setupHoraAvailabilityValidation(): void {
    const horaControl = this.form.get('hora');
    if (!horaControl) return;

    horaControl.valueChanges
      .pipe(
        debounceTime(300),
        switchMap((hora: string) => {
          const profesionalId = this.form.get('profesionalId')?.value;

          // Si falta profesional, fecha o hora, limpiamos el error y no validamos
          if (!profesionalId || !this.selectedDate || !hora) {
            this.availabilityError = null;
            return of(null);
          }

          const normalizedHora = this.normalizeTime(hora);
          if (!normalizedHora) {
            this.availabilityError = 'Formato de hora inválido. Use HH:mm.';
            return of(null);
          }

          this.isCheckingAvailability = true;
          this.availabilityError = null;

          return this.appointmentsService.checkAvailability(profesionalId, this.selectedDate, normalizedHora).pipe(
            catchError((err) => {
              console.warn('Error verificando disponibilidad (cambio de hora):', err);
              // No bloqueamos al usuario por un error de red puntual
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((isAvailable) => {
        this.isCheckingAvailability = false;
        if (isAvailable === null) {
          return;
        }
        this.availabilityError = isAvailable ? null : 'Este horario ya está ocupado. Por favor, seleccione otro horario.';
      });
  }

  onSubmit(): void {
    // Normalizar espacios en los campos requeridos de datos personales
    this.trimPersonalData();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // La disponibilidad (profesional y paciente) la valida el backend al crear el turno,
    // que es la única fuente de verdad y siempre muestra el toast correspondiente ante un conflicto.
    const raw = this.form.getRawValue();
    this.submitFormData(raw);
  }

  /**
   * Aplica trim() a los campos requeridos de datos personales
   * para evitar espacios en blanco al inicio/fin
   */
  private trimPersonalData(): void {
    if (!this.form) return;

    const personalRequiredFields = [
      'nombre',
      'apellido',
      'identificacion',
      'telefono',
      'email',
      'domicilio',
      'localidad'
    ];

    personalRequiredFields.forEach(fieldName => {
      const control = this.form.get(fieldName);
      if (!control) return;

      const value = control.value;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== value) {
          control.setValue(trimmed);
        }
      }
    });
  }

  /**
   * Enviar los datos del formulario
   */
  private submitFormData(raw: any): void {
    // Construir objeto de anamnesis con los antecedentes médicos
    const anamnesisData: any = {};
    if (raw.enfermedades) anamnesisData.enfermedades = raw.enfermedades;
    if (raw.alergias) anamnesisData.alergias = raw.alergias;
    if (raw.medicacion) anamnesisData.medicacion = raw.medicacion;
    if (raw.cirugias) anamnesisData.cirugias = raw.cirugias;
    if (raw.embarazo) anamnesisData.embarazo = raw.embarazo;
    if (raw.marcapasos) anamnesisData.marcapasos = raw.marcapasos;
    if (raw.consumos) anamnesisData.consumos = raw.consumos;
    if (raw.otrosAntecedentes) anamnesisData.otrosAntecedentes = raw.otrosAntecedentes;

    const anamnesis = Object.keys(anamnesisData).length > 0 
      ? JSON.stringify(anamnesisData) 
      : undefined;

    // Datos del paciente
    const patientData: Partial<Patient> = {
      id: this.selectedPatient?.id,
      nombre: raw.nombre,
      apellido: raw.apellido,
      fechaNacimiento: raw.fechaNacimiento || undefined,
      identificacion: raw.identificacion,
      telefono: raw.telefono,
      email: raw.email,
      domicilio: raw.domicilio,
      localidad: raw.localidad,
      contactoEmergencia: raw.contactoEmergencia || undefined,
      anamnesis: anamnesis,
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

    // Datos del turno
    const appointmentData: AppointmentCreateDTO = {
      patientId: this.selectedPatient?.id || '', // Se actualizará si es paciente nuevo
      profesionalId: raw.profesionalId || undefined,
      fecha: this.selectedDate || '',
      hora: this.normalizeTime(raw.hora), // Normalizar formato de hora
      estado: 'PENDIENTE',
      precioBono: this.parseAmount(raw.precioBono), // Parsear monto de forma segura
      precioTratamiento: this.parseAmount(raw.precioTratamiento), // Parsear monto de forma segura
      extras: this.parseAmount(raw.extras), // Parsear monto de forma segura
      montoPago: this.parseAmount(raw.montoPago), // Parsear monto de forma segura
      observaciones: raw.observaciones || undefined,
      observacionesTurno: raw.observacionesTurno || undefined
    };

    this.submitForm.emit({ patientData, appointmentData });

    // Nota: El formulario se limpia únicamente cuando se cierra el diálogo
    // (open cambia de true a false o se llama a close()).
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
