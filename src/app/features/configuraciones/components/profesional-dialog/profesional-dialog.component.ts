import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Profesional, ProfesionalCreateDTO, MODULE_OPTIONS } from '../../../../core/models';
import { documentNumberValidator, phoneValidator } from '../../../../shared/validators/custom-validators';

interface PasswordStrength {
  width: string;
  color: string;
  label: string;
}

/** Coincide con los íconos de cada pestaña en app-navbar. */
const MODULE_ICONS: Record<string, string> = {
  PANEL: 'bi-speedometer2',
  TURNOS: 'bi-calendar',
  ODONTOGRAMA: 'bi-heart-pulse',
  SEGUIMIENTO: 'bi-clipboard-data',
  COBERTURA: 'bi-shield-check',
  CONFIGURACIONES: 'bi-gear'
};

const PASSWORD_STRENGTH_LEVELS: PasswordStrength[] = [
  { width: '25%', color: '#F04349', label: 'Débil' },
  { width: '50%', color: '#FDCD0F', label: 'Aceptable' },
  { width: '75%', color: '#6366f1', label: 'Buena' },
  { width: '100%', color: '#01E17B', label: 'Fuerte' }
];

@Component({
  selector: 'app-profesional-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profesional-dialog.component.html',
  styleUrls: ['./profesional-dialog.component.scss']
})
export class ProfesionalDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() editingProfesional: Profesional | null = null;
  @Input() isOwner = false;
  @Input() moduleOptions = MODULE_OPTIONS;
  @Input() isSaving = false;
  @Input() saveError = '';

  @Output() openChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<ProfesionalCreateDTO>();

  readonly form: FormGroup;
  moduleCodes: string[] = [];
  showPassword = false;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.buildForm();
    this.form.get('crearAcceso')!.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateAccesoValidators());
  }

  get isEditing(): boolean {
    return !!this.editingProfesional;
  }

  /** Solo un OWNER puede otorgar acceso al sistema, y solo al crear (no al editar). */
  get canCreateAccess(): boolean {
    return this.isOwner && !this.isEditing;
  }

  get hasLinkedUser(): boolean {
    return !!this.editingProfesional?.userId;
  }

  /** Un OWNER puede editar los módulos habilitados de un profesional que ya tiene usuario. */
  get canEditModules(): boolean {
    return this.isOwner && this.isEditing && this.hasLinkedUser;
  }

  get showModulesSection(): boolean {
    return (this.canCreateAccess && this.form.value.crearAcceso) || this.canEditModules;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetForm();
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      identificacion: ['', documentNumberValidator()],
      especialidad: [''],
      matricula: [''],
      email: ['', Validators.email],
      telefono: ['', phoneValidator()],
      crearAcceso: [false],
      username: [''],
      password: ['']
    });
  }

  private updateAccesoValidators(): void {
    const usernameCtrl = this.form.get('username')!;
    const passwordCtrl = this.form.get('password')!;
    if (this.canCreateAccess && this.form.value.crearAcceso) {
      usernameCtrl.setValidators([Validators.required]);
      passwordCtrl.setValidators([Validators.required, Validators.minLength(6)]);
    } else {
      usernameCtrl.clearValidators();
      passwordCtrl.clearValidators();
    }
    usernameCtrl.updateValueAndValidity({ emitEvent: false });
    passwordCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private resetForm(): void {
    const prof = this.editingProfesional;
    this.form.reset({
      nombre: prof?.nombre || '',
      apellido: prof?.apellido || '',
      identificacion: prof?.identificacion || '',
      especialidad: prof?.especialidad || '',
      matricula: prof?.matricula || '',
      email: prof?.email || '',
      telefono: prof?.telefono || '',
      crearAcceso: false,
      username: '',
      password: ''
    });
    this.moduleCodes = prof?.moduleCodes ? [...prof.moduleCodes] : [];
    this.showPassword = false;
    this.updateAccesoValidators();
  }

  moduleIcon(code: string): string {
    return MODULE_ICONS[code] || 'bi-app-indicator';
  }

  isModuleSelected(code: string): boolean {
    return this.moduleCodes.includes(code);
  }

  toggleModule(code: string): void {
    this.moduleCodes = this.isModuleSelected(code)
      ? this.moduleCodes.filter(c => c !== code)
      : [...this.moduleCodes, code];
  }

  toggleCrearAcceso(): void {
    const ctrl = this.form.get('crearAcceso')!;
    const next = !ctrl.value;
    ctrl.setValue(next);
    if (!next) {
      this.form.patchValue({ username: '', password: '' });
      this.moduleCodes = [];
      this.showPassword = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  passwordStrength(): PasswordStrength {
    const pass = this.form.value.password || '';
    if (!pass) {
      return { width: '0%', color: '#e2e8f0', label: 'Ingresá al menos 6 caracteres' };
    }
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return PASSWORD_STRENGTH_LEVELS[Math.min(score, 4) - 1] || PASSWORD_STRENGTH_LEVELS[0];
  }

  close(): void {
    this.openChange.emit(false);
  }

  handleSubmit(): void {
    if (this.isSaving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    const crearAcceso = this.canCreateAccess && !!value.crearAcceso;
    if (crearAcceso && this.moduleCodes.length === 0) {
      this.saveError = 'Seleccioná al menos un módulo para el usuario';
      return;
    }
    const dto: ProfesionalCreateDTO = {
      nombre: value.nombre,
      apellido: value.apellido,
      identificacion: value.identificacion || undefined,
      especialidad: value.especialidad || undefined,
      matricula: value.matricula || undefined,
      email: value.email || undefined,
      telefono: value.telefono || undefined,
      activo: this.editingProfesional ? this.editingProfesional.activo !== false : true,
      crearAcceso,
      username: crearAcceso ? value.username : undefined,
      password: crearAcceso ? value.password : undefined,
      moduleCodes: crearAcceso || this.canEditModules ? [...this.moduleCodes] : undefined
    };
    this.save.emit(dto);
  }
}
