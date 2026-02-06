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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Patient, Profesional } from '../../../core/models';
import { SearchInputComponent, SearchResult } from '../search-input/search-input.component';
import { getPatientFormConfig, OBRAS_SOCIALES } from './patient-form.config';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchInputComponent],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss']
})
export class PatientFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() form!: FormGroup;
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

  readonly OBRAS_SOCIALES = OBRAS_SOCIALES;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setupFormLogic();
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

  onPatientSearchSelect(result: SearchResult): void {
    if (result.type === 'patient') {
      this.patientSelect.emit(result.item as Patient);
    }
  }

  onClearPatient(): void {
    this.clearPatient.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

export { getPatientFormConfig, OBRAS_SOCIALES };
