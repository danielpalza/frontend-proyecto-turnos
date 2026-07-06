import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { Patient, Profesional } from '../../../core/models';
import { PatientFormComponent } from '../patient-form/patient-form.component';
import { fullName } from '../../../core/utils/full-name.util';
import {
  PATIENT_WIZARD_STEPS,
  PATIENT_WIZARD_REVIEW_GROUPS,
  WizardStepDef,
  ReviewGroup,
  ReviewField
} from './patient-wizard.config';

@Component({
  selector: 'app-patient-wizard',
  standalone: true,
  imports: [CommonModule, PatientFormComponent],
  templateUrl: './patient-wizard.component.html',
  styleUrls: ['./patient-wizard.component.scss']
})
export class PatientWizardComponent {
  @Input() form!: FormGroup;
  @Input() includeAppointmentStep = false;
  @Input() showSearch = false;
  @Input() existingPatients: Patient[] = [];
  @Input() selectedPatient: Patient | null = null;
  @Input() profesionales: Profesional[] = [];
  @Input() isCheckingAvailability = false;
  @Input() availabilityError: string | null = null;
  @Input() calcularResto: () => number = () => 0;
  @Input() isSubmitting = false;

  @Output() patientSelect = new EventEmitter<Patient>();
  @Output() clearPatient = new EventEmitter<void>();
  @Output() finish = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('stepHeading') stepHeadingRef?: ElementRef<HTMLElement>;

  currentStep = 1;
  visitedSteps = new Set<number>([1]);
  openAccordionStep: number | null = 1;

  get steps(): WizardStepDef[] {
    return PATIENT_WIZARD_STEPS.filter(s => !s.appointmentOnly || this.includeAppointmentStep);
  }

  get reviewGroups(): ReviewGroup[] {
    return PATIENT_WIZARD_REVIEW_GROUPS.filter(g => g.stepId !== 4 || this.includeAppointmentStep);
  }

  get currentStepDef(): WizardStepDef | undefined {
    return this.steps.find(s => s.id === this.currentStep);
  }

  get stepIndex(): number {
    return this.steps.findIndex(s => s.id === this.currentStep) + 1;
  }

  get progressPercent(): number {
    return Math.round((this.stepIndex / this.steps.length) * 100);
  }

  get isFirstStep(): boolean {
    return this.steps.length > 0 && this.currentStep === this.steps[0].id;
  }

  get isLastStep(): boolean {
    return this.steps.length > 0 && this.currentStep === this.steps[this.steps.length - 1].id;
  }

  isStepValid(stepId: number): boolean {
    const def = this.steps.find(s => s.id === stepId);
    if (!def) return true;
    return def.requiredControls.every(name => {
      const control = this.form.get(name);
      return !control || control.disabled || control.valid;
    });
  }

  isStepDone(stepId: number): boolean {
    return this.visitedSteps.has(stepId) && stepId !== this.currentStep && this.isStepValid(stepId);
  }

  goToStep(target: number): void {
    if (target === this.currentStep) return;

    if (target < this.currentStep) {
      if (this.visitedSteps.has(target)) {
        this.setCurrentStep(target);
      }
      return;
    }

    const ids = this.steps.map(s => s.id);
    const fromIdx = ids.indexOf(this.currentStep);
    const toIdx = ids.indexOf(target);
    for (let i = fromIdx; i < toIdx; i++) {
      if (!this.isStepValid(ids[i])) {
        this.setCurrentStep(ids[i]);
        return;
      }
    }
    this.setCurrentStep(target);
  }

  next(): void {
    const ids = this.steps.map(s => s.id);
    const idx = ids.indexOf(this.currentStep);
    if (idx < ids.length - 1) {
      this.goToStep(ids[idx + 1]);
    }
  }

  back(): void {
    const ids = this.steps.map(s => s.id);
    const idx = ids.indexOf(this.currentStep);
    if (idx > 0) {
      this.goToStep(ids[idx - 1]);
    }
  }

  toggleAccordion(stepId: number): void {
    this.openAccordionStep = this.openAccordionStep === stepId ? null : stepId;
  }

  formatReviewValue(field: ReviewField): string {
    const value = this.form.get(field.name)?.value;
    if (value === null || value === undefined || value === '') return '';
    return field.format ? field.format(value) : String(value);
  }

  getProfesionalLabel(): string {
    const id = this.form.get('profesionalId')?.value;
    if (!id) return '';
    const prof = this.profesionales.find(p => p.id === id);
    return prof ? fullName(prof.nombre, prof.apellido) : '';
  }

  onPatientSelect(patient: Patient): void {
    this.patientSelect.emit(patient);
  }

  onClearPatient(): void {
    this.clearPatient.emit();
  }

  private setCurrentStep(step: number): void {
    this.currentStep = step;
    this.visitedSteps.add(step);
    if (step === this.steps[this.steps.length - 1]?.id) {
      this.openAccordionStep = this.reviewGroups[0]?.stepId ?? null;
    }
    setTimeout(() => this.stepHeadingRef?.nativeElement.focus());
  }
}
