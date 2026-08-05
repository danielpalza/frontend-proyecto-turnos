/**
 * Formulario de Historia Clínica Básica: 6 secciones fijas + flujo borrador/firma.
 * Ver especificación funcional en el plan de integración del módulo HISTORIA_CLINICA_FREE.
 */
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HistoriaClinicaStateService } from '../../services/historia-clinica-state.service';
import { HistoriaClinicaDeltaRequest, HistoriaClinicaResponse } from '../../../../core/models/historia-clinica.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Capability } from '../../../../core/auth/capabilities';

/**
 * "Datos del paciente" y "Antecedentes" son datos del paciente, no del turno: editarlos acá también
 * sincroniza la ficha del paciente (ver HistoriaClinicaService.sincronizarPaciente en el backend), así
 * que hace falta el mismo permiso que edita un paciente en cualquier otro lugar del sistema — no
 * alcanza con poder editar la historia clínica.
 */
const PATIENT_SECTION_CONTROLS = [
  'nombreCompleto', 'dni', 'fechaConsulta', 'cobertura', 'telefono',
  'enfermedades', 'alergias', 'medicacion', 'cirugias', 'embarazo', 'marcapasos', 'consumos', 'otrosAntecedentes'
];

@Component({
  selector: 'app-historia-clinica-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './historia-clinica-form.component.html',
  styleUrls: ['./historia-clinica-form.component.scss']
})
export class HistoriaClinicaFormComponent implements OnInit {
  form!: FormGroup;

  readonly editable = signal(true);
  readonly saving = signal(false);
  readonly signing = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly showSignConfirm = signal(false);

  current: HistoriaClinicaResponse | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  constructor(
    private readonly fb: FormBuilder,
    private readonly stateService: HistoriaClinicaStateService
  ) {}

  /** Permiso para tocar "Datos del paciente" y "Antecedentes": el mismo que edita un paciente en
   * cualquier otro lugar del sistema, no el de editar la historia clínica. */
  get canEditPatientData(): boolean {
    return this.authService.hasCapability(Capability.TURNOS_MANAGE)
        || this.authService.hasCapability(Capability.SEGUIMIENTO_PACIENTES);
  }

  ngOnInit(): void {
    this.initForm();
    this.applyPatientSectionAccess();

    this.stateService.editable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(editable => {
        this.editable.set(editable);
        editable ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false });
        this.applyPatientSectionAccess();
      });

    this.stateService.form$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.current = data;
        if (data) {
          this.form.patchValue(data, { emitEvent: false });
        }
      });
  }

  /**
   * Dentro de un formulario editable, "Datos del paciente" y "Antecedentes" tienen su propio gate,
   * independiente del resto: sin `canEditPatientData` quedan deshabilitados aunque el usuario sí
   * pueda editar el resto de la historia clínica.
   */
  private applyPatientSectionAccess(): void {
    const allowed = this.editable() && this.canEditPatientData;
    for (const name of PATIENT_SECTION_CONTROLS) {
      const control = this.form.get(name);
      if (!control) continue;
      allowed ? control.enable({ emitEvent: false }) : control.disable({ emitEvent: false });
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      // Sección 1 — datos del paciente
      nombreCompleto: ['', Validators.required],
      dni: ['', Validators.required],
      fechaConsulta: [''],
      cobertura: [''],
      telefono: [''],
      // Sección 2
      motivoConsulta: ['', Validators.required],
      // Sección 3
      enfermedadActual: [''],
      // Sección 4 — antecedentes médicos del paciente
      enfermedades: [''],
      alergias: [''],
      medicacion: [''],
      cirugias: [''],
      embarazo: [''],
      marcapasos: [''],
      consumos: [''],
      otrosAntecedentes: [''],
      // Sección 5
      tensionArterial: [''],
      frecuenciaCardiaca: [null],
      temperatura: [null],
      peso: [null],
      examenPorSistemas: [''],
      // Sección 6
      diagnostico: [''],
      diagnosticoCie10Codigo: [''],
      indicaciones: ['']
    });
  }

  get isFirmado(): boolean {
    return this.current?.estado === 'FIRMADO';
  }

  /**
   * `.value` (no `.getRawValue()`) a propósito: los controles deshabilitados (sin
   * `canEditPatientData`) quedan afuera del payload, en vez de reenviar el mismo valor precargado en
   * cada guardado — así el backend nunca ve esos campos como "cambiados" y no exige el permiso extra
   * para guardar el resto de la ficha.
   */
  private buildDelta(): HistoriaClinicaDeltaRequest {
    return this.form.value;
  }

  guardarBorrador(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.stateService.saveDraft(this.buildDelta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.saving.set(false),
        error: () => {
          this.saving.set(false);
          this.saveError.set('No se pudo guardar el borrador. Intentá de nuevo.');
        }
      });
  }

  confirmarFirma(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.showSignConfirm.set(true);
  }

  cancelarFirma(): void {
    this.showSignConfirm.set(false);
  }

  firmarYGuardar(): void {
    // Guard explícito, independiente de [disabled]="signing()" en el template: un doble click
    // puede disparar dos veces este handler antes de que Angular re-renderice el botón, y dos PATCH
    // /firmar en paralelo chocan contra la restricción única de la tabla (409).
    if (this.signing()) {
      return;
    }
    this.showSignConfirm.set(false);
    this.signing.set(true);
    this.saveError.set(null);
    this.stateService.sign(this.buildDelta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.signing.set(false),
        error: () => {
          this.signing.set(false);
          this.saveError.set('No se pudo firmar la historia clínica. Intentá de nuevo.');
        }
      });
  }
}
