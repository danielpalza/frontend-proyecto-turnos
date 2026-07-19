import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { documentNumberValidator } from '../../validators/custom-validators';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Patient, Profesional } from '../../../core/models';
import { SearchInputComponent, SearchResult } from '../search-input/search-input.component';
import { getPatientFormConfig, COBERTURA_PARTICULAR } from './patient-form.config';
import { fullName } from '../../../core/utils/full-name.util';
import { CoberturasService } from '../../../features/coberturas/coberturas.service';
import { AuthService } from '../../../core/services/auth.service';

export interface CoberturaOption {
  id: string;
  value: string;
  label: string;
}

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchInputComponent],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss']
})
export class PatientFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() form!: FormGroup;
  /** Paso activo del wizard (null = mostrar todas las secciones, comportamiento standalone) */
  @Input() activeStep: number | null = null;
  /** Mostrar bloque de búsqueda de paciente existente */
  @Input() showSearch = false;
  /** Mostrar sección de datos del turno */
  @Input() showAppointmentDetails = false;
  /** Mostrar sección de detalles de pago */
  @Input() showPaymentDetails = false;
  @Input() existingPatients: Patient[] = [];
  @Input() selectedPatient: Patient | null = null;
  @Input() profesionales: Profesional[] = [];
  @Input() isCheckingAvailability = false;
  @Input() availabilityError: string | null = null;
  @Input() calcularResto: () => number = () => 0;

  @Output() patientSelect = new EventEmitter<Patient>();
  @Output() clearPatient = new EventEmitter<void>();

  readonly COBERTURA_PARTICULAR = COBERTURA_PARTICULAR;
  coberturaOptions: CoberturaOption[] = [];
  private destroy$ = new Subject<void>();

  get otrosAntecedentesLength(): number {
    return (this.form?.get('otrosAntecedentes')?.value ?? '').length;
  }

  constructor(
    private fb: FormBuilder,
    private coberturasService: CoberturasService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupFormLogic();
    this.loadCoberturaOptions();
  }

  private loadCoberturaOptions(): void {
    const pais = this.authService.getCurrentUser()?.organizationPais || 'AR';
    this.coberturasService.listar([pais]).pipe(takeUntil(this.destroy$)).subscribe({
      next: coberturas => {
        this.coberturaOptions = coberturas
          .map(c => {
            const value = c.sigla?.trim() || c.nombre;
            return { id: c.id, value, label: value };
          })
          .sort((a, b) => a.value.localeCompare(b.value));
      },
      error: () => {
        this.coberturaOptions = [];
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form'] && this.form) {
      this.setupFormLogic();
    }
  }

  private setupFormLogic(): void {
    if (!this.form) return;

    // Edad a partir de fechaNacimiento
    this.form.get('fechaNacimiento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val: string) => {
        if (val) {
          const birthDate = new Date(val);
          const today = new Date();
          if (isNaN(birthDate.getTime()) || birthDate > today) {
            this.form.get('edad')?.setValue('', { emitEvent: false });
            return;
          }
          const maxAge = 150;
          if (birthDate.getFullYear() < today.getFullYear() - maxAge) {
            this.form.get('edad')?.setValue('', { emitEvent: false });
            return;
          }
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

    // Validaciones condicionales titular
    const updateTitularValidators = () => {
      const esTitular = this.form.get('esTitular')?.value;
      const cobertura = this.form.get('coberturaNombre')?.value;
      const nombreTitular = this.form.get('nombreTitular')!;
      const identificacionTitular = this.form.get('identificacionTitular')!;
      const parentesco = this.form.get('parentesco')!;
      if (esTitular === 'no' && cobertura !== 'Particular') {
        nombreTitular.setValidators([Validators.required]);
        identificacionTitular.setValidators([Validators.required, documentNumberValidator()]);
        parentesco.setValidators([Validators.required]);
      } else {
        nombreTitular.clearValidators();
        identificacionTitular.setValidators([documentNumberValidator()]);
        parentesco.clearValidators();
      }
      nombreTitular.updateValueAndValidity();
      identificacionTitular.updateValueAndValidity();
      parentesco.updateValueAndValidity();
    };

    this.form.get('esTitular')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => updateTitularValidators());

    this.form.get('coberturaNombre')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: string) => {
        if (value === COBERTURA_PARTICULAR) {
          this.form.patchValue({
            coberturaId: '',
            planCategoria: '',
            coberturaNumero: '',
            coberturaVencimiento: '',
            esTitular: 'si',
            nombreTitular: '',
            identificacionTitular: '',
            parentesco: ''
          }, { emitEvent: false });
        }
        updateTitularValidators();
      });
  }

  showCoberturaDropdown = false;

  get filteredCoberturaOptions(): CoberturaOption[] {
    const term = (this.form.get('coberturaNombre')?.value || '').toString().toLowerCase().trim();
    const todas: CoberturaOption[] = [
      { id: '', value: COBERTURA_PARTICULAR, label: COBERTURA_PARTICULAR },
      ...this.coberturaOptions
    ];
    if (!term) return todas;
    return todas.filter(o => o.value.toLowerCase().includes(term));
  }

  /** Dispara solo con tipeo real del usuario (evento DOM nativo, no con patchValue programático). */
  onCoberturaInput(): void {
    this.form.get('coberturaId')?.setValue('', { emitEvent: false });
    this.showCoberturaDropdown = true;
  }

  onCoberturaFocus(): void {
    this.showCoberturaDropdown = true;
  }

  onCoberturaBlur(): void {
    // Delay para que el (mousedown) del item del dropdown se procese antes de cerrar
    setTimeout(() => { this.showCoberturaDropdown = false; }, 150);
  }

  selectCobertura(opt: CoberturaOption): void {
    this.form.patchValue({ coberturaNombre: opt.value, coberturaId: opt.id });
    this.showCoberturaDropdown = false;
  }

  onPatientSearchSelect(result: SearchResult): void {
    if (result.type === 'patient') {
      this.patientSelect.emit(result.item as Patient);
    }
  }

  onClearPatient(): void {
    this.clearPatient.emit();
  }

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  getProfesionalFullName(prof: Profesional): string {
    return fullName(prof.nombre, prof.apellido);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

export { getPatientFormConfig, COBERTURA_PARTICULAR };
