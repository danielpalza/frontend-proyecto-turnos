import { Component, EventEmitter, Input, OnInit, OnChanges, OnDestroy, Output, SimpleChanges, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Patient, Profesional, AppointmentCreateDTO } from '../../../../core/models';
import { AppointmentsService } from '../../../../core/services/appointments.service';

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-dialog.component.html',
  styleUrls: ['./appointment-dialog.component.scss']
})
export class AppointmentDialogComponent implements OnInit, OnChanges, OnDestroy {
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
  isCheckingAvailability = false;
  availabilityError: string | null = null;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

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

  constructor(
    private fb: FormBuilder, 
    private elRef: ElementRef,
    private appointmentsService: AppointmentsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupSearchDebounce();
    this.setupHoraAvailabilityValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingPatients']) {
      this.filteredPatients = this.existingPatients;
    }
    
    // Detectar cuando el diálogo se cierra para limpiar el formulario
    // Esto asegura que el formulario se limpie incluso cuando se cierra desde el componente padre
    if (changes['open'] && !changes['open'].currentValue && changes['open'].previousValue) {
      // Se cerró el diálogo (cambió de true a false)
      this.clearPatientSelection();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      // Datos Personales del Paciente
      nombreApellido: ['', Validators.required],
      fechaNacimiento: [''],
      edad: [{ value: '', disabled: true }],
      dni: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      domicilio: ['', Validators.required],
      localidad: ['', Validators.required],
      contactoEmergencia: [''],
      // Antecedentes médicos
      enfermedades: [''],
      alergias: [''],
      medicacion: [''],
      cirugias: [''],
      embarazo: [''],
      marcapasos: [''],
      consumos: [''],
      // Cobertura
      obraSocialNombre: ['', Validators.required],
      planCategoria: [''],
      obraSocialNumero: [''],
      obraSocialVencimiento: [''],
      esTitular: ['si'],
      nombreTitular: [''],
      dniTitular: [''],
      parentesco: [''],
      // Turno
      profesionalId: [''],
      hora: ['09:00'],
      // Pago
      observacionesTurno: [''],
      precioBono: [null],
      precioTratamiento: [null],
      extras: [null],
      montoPago: [null],
      observaciones: ['']
    });

    // Calcular edad a partir de fechaNacimiento con validaciones
    this.form.get('fechaNacimiento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val: string) => {
        if (val) {
          const birthDate = new Date(val);
          const today = new Date();
          
          // Validar que la fecha no sea inválida
          if (isNaN(birthDate.getTime())) {
            this.form.get('edad')?.setValue('', { emitEvent: false });
            return;
          }
          
          // Validar que la fecha no sea futura
          if (birthDate > today) {
            this.form.get('edad')?.setValue('', { emitEvent: false });
            return;
          }
          
          // Validar que la fecha no sea muy antigua (más de 150 años)
          const maxAge = 150;
          const minYear = today.getFullYear() - maxAge;
          if (birthDate.getFullYear() < minYear) {
            this.form.get('edad')?.setValue('', { emitEvent: false });
            return;
          }
          
          // Calcular edad correctamente
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

    // Validaciones condicionales para titular
    this.form.get('esTitular')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val: string) => {
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
   * Buscar pacientes mientras escribe (con debounce para mejor performance)
   */
  onSearchPatient(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
    this.isNewPatient = true;
  }

  /**
   * Configurar debounce para búsqueda de pacientes
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Esperar 300ms después de la última tecla
      distinctUntilChanged(), // Solo filtrar si el valor cambió
      takeUntil(this.destroy$)
    ).subscribe(searchValue => {
      const value = searchValue.toLowerCase();
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
    });
  }
  /**
   * Mostrar todos los pacientes al enfocar el input si está vacío
   */
  onSearchPatientFocus(event: FocusEvent): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (!value) {
      this.filteredPatients = this.existingPatients;
      this.showPatientDropdown = this.filteredPatients.length > 0;
      this.isNewPatient = true;
      this.selectedPatient = null;
    }
  }

  /**
   * Cerrar el listado cuando el input pierde el foco
   * (usamos mousedown en lugar de click, por lo que no necesitamos delay largo)
   */
  onSearchPatientBlur(): void {
    // Usar un pequeño delay mínimo solo para asegurar que el mousedown se procese primero
    // mousedown se dispara antes de blur, por lo que el delay es mucho más corto y robusto
    setTimeout(() => {
      this.showPatientDropdown = false;
    }, 10);
  }

  /**
   * Cerrar el listado si se hace click fuera del contenedor de búsqueda
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const searchContainer: HTMLElement | null =
      this.elRef.nativeElement.querySelector('.patient-search-container');

    if (searchContainer && !searchContainer.contains(target)) {
      this.showPatientDropdown = false;
    }
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
      nombreApellido: patient.nombreApellido,
      fechaNacimiento: patient.fechaNacimiento || '',
      dni: patient.dni,
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
      obraSocialNombre: patient.obraSocialNombre || '',
      planCategoria: patient.planCategoria || '',
      obraSocialNumero: patient.obraSocialNumero || '',
      obraSocialVencimiento: patient.obraSocialVencimiento || '',
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
      consumos: ''
    });
  }

  close(): void {
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
    return Number.isFinite(resultado) ? resultado : 0;
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
        takeUntil(this.destroy$)
      )
      .subscribe((hora: string) => {
        const profesionalId = this.form.get('profesionalId')?.value;

        // Si falta profesional, fecha o hora, limpiamos el error y no validamos
        if (!profesionalId || !this.selectedDate || !hora) {
          this.availabilityError = null;
          return;
        }

        const normalizedHora = this.normalizeTime(hora);
        if (!normalizedHora) {
          this.availabilityError = 'Formato de hora inválido. Use HH:mm.';
          return;
        }

        this.isCheckingAvailability = true;
        this.availabilityError = null;

        this.appointmentsService.checkAvailability(profesionalId, this.selectedDate, normalizedHora)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (isAvailable) => {
              this.isCheckingAvailability = false;
              if (!isAvailable) {
                this.availabilityError = 'Este horario ya está ocupado. Por favor, seleccione otro horario.';
              } else {
                this.availabilityError = null;
              }
            },
            error: (err) => {
              this.isCheckingAvailability = false;
              console.warn('Error verificando disponibilidad (cambio de hora):', err);
              // No bloqueamos al usuario por un error de red puntual
              this.availabilityError = null;
            }
          });
      });
  }

  onSubmit(): void {
    // Normalizar espacios en los campos requeridos de datos personales
    this.trimPersonalData();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Validar disponibilidad solo al enviar el formulario
    const raw = this.form.getRawValue();
    const profesionalId = raw.profesionalId;
    const hora = raw.hora;

    // Solo verificar si hay profesional, fecha y hora
    if (profesionalId && this.selectedDate && hora) {
      const normalizedHora = this.normalizeTime(hora);
      if (!normalizedHora) {
        // Si no se puede normalizar la hora, proceder (el backend validará)
        this.submitFormData(raw);
        return;
      }

      // Verificar disponibilidad antes de enviar
      this.isCheckingAvailability = true;
      this.availabilityError = null;

      this.appointmentsService.checkAvailability(profesionalId, this.selectedDate, normalizedHora)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (isAvailable) => {
            this.isCheckingAvailability = false;
            if (!isAvailable) {
              this.availabilityError = 'Este horario ya está ocupado. Por favor, seleccione otro horario.';
              this.form.markAllAsTouched();
              return;
            }
            // Si está disponible, proceder con el envío
            this.availabilityError = null;
            this.submitFormData(raw);
          },
          error: (err) => {
            this.isCheckingAvailability = false;
            // En caso de error, permitir el envío (el backend validará)
            console.warn('Error verificando disponibilidad:', err);
            this.availabilityError = null;
            this.submitFormData(raw);
          }
        });
      return; // No continuar hasta que se complete la verificación
    }

    // Si no hay profesional o no se puede verificar, proceder normalmente
    this.submitFormData(raw);
  }

  /**
   * Aplica trim() a los campos requeridos de datos personales
   * para evitar espacios en blanco al inicio/fin
   */
  private trimPersonalData(): void {
    if (!this.form) return;

    const personalRequiredFields = [
      'nombreApellido',
      'dni',
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

    const anamnesis = Object.keys(anamnesisData).length > 0 
      ? JSON.stringify(anamnesisData) 
      : undefined;

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
      anamnesis: anamnesis,
      obraSocialNombre: raw.obraSocialNombre,
      planCategoria: raw.planCategoria || undefined,
      obraSocialNumero: raw.obraSocialNumero || undefined,
      obraSocialVencimiento: raw.obraSocialVencimiento || undefined,
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
