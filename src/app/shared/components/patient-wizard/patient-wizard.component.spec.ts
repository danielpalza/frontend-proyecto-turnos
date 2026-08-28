import { render } from '@testing-library/angular';
import { FormBuilder, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { PatientWizardComponent } from './patient-wizard.component';
import { getPatientFormConfig } from '../patient-form/patient-form.component';
import { CoberturasService } from '../../../features/coberturas/coberturas.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewField } from './patient-wizard.config';
import { createAuthServiceMock } from '../../../../testing/auth-service.mock';

function buildWizardForm() {
  const fb = new FormBuilder();
  return fb.group({
    ...getPatientFormConfig(fb),
    profesionalId: [''],
    moduloClinicoId: ['', Validators.required],
    hora: ['09:00'],
    observacionesTurno: [''],
    precioBono: [null as number | null],
    precioTratamiento: [null as number | null],
    extras: [null as number | null],
    montoPago: [null as number | null],
    observaciones: ['']
  });
}

function fillStep1Valid(form: ReturnType<typeof buildWizardForm>) {
  form.patchValue({
    nombre: 'Ana',
    apellido: 'García',
    identificacion: '12345678',
    telefono: '1122334455',
    email: 'test@test.com',
    domicilio: 'Calle 123',
    localidad: 'CABA'
  });
}

async function renderWizard(overrides: { includeAppointmentStep?: boolean; form?: ReturnType<typeof buildWizardForm> } = {}) {
  const form = overrides.form ?? buildWizardForm();
  const result = await render(PatientWizardComponent, {
    inputs: { form, includeAppointmentStep: overrides.includeAppointmentStep ?? false },
    providers: [
      { provide: CoberturasService, useValue: { listar: vi.fn(() => of([])) } },
      { provide: AuthService, useValue: createAuthServiceMock({ getCurrentUser: vi.fn(() => ({ organizationPais: 'AR' })) }) }
    ]
  });
  return { ...result, form };
}

describe('PatientWizardComponent', () => {
  describe('steps/reviewGroups condicionados a includeAppointmentStep', () => {
    it('sin includeAppointmentStep, excluye el paso "Turno y pago" y su grupo de revisión', async () => {
      const { fixture } = await renderWizard({ includeAppointmentStep: false });

      expect(fixture.componentInstance.steps.map(s => s.id)).toEqual([1, 2, 3, 5]);
      expect(fixture.componentInstance.reviewGroups.map(g => g.stepId)).toEqual([1, 2, 3]);
    });

    it('con includeAppointmentStep, incluye el paso 4 y su grupo de revisión', async () => {
      const { fixture } = await renderWizard({ includeAppointmentStep: true });

      expect(fixture.componentInstance.steps.map(s => s.id)).toEqual([1, 2, 3, 4, 5]);
      expect(fixture.componentInstance.reviewGroups.map(g => g.stepId)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('progreso', () => {
    it('en el paso 1 sin turno: stepIndex=1 sobre 4 pasos, 25%', async () => {
      const { fixture } = await renderWizard({ includeAppointmentStep: false });

      expect(fixture.componentInstance.stepIndex).toBe(1);
      expect(fixture.componentInstance.progressPercent).toBe(25);
      expect(fixture.componentInstance.isFirstStep).toBe(true);
      expect(fixture.componentInstance.isLastStep).toBe(false);
    });

    it('en el paso 1 con turno: stepIndex=1 sobre 5 pasos, 20%', async () => {
      const { fixture } = await renderWizard({ includeAppointmentStep: true });

      expect(fixture.componentInstance.progressPercent).toBe(20);
    });
  });

  describe('isStepValid / avance con next()', () => {
    it('el paso 1 es inválido con los campos requeridos vacíos', async () => {
      const { fixture } = await renderWizard();
      expect(fixture.componentInstance.isStepValid(1)).toBe(false);
    });

    it('next() no avanza si el paso actual es inválido', async () => {
      const { fixture } = await renderWizard();

      fixture.componentInstance.next();

      expect(fixture.componentInstance.currentStep).toBe(1);
    });

    it('next() avanza al completar los campos requeridos del paso actual', async () => {
      const { fixture, form } = await renderWizard();
      fillStep1Valid(form);

      fixture.componentInstance.next();

      expect(fixture.componentInstance.currentStep).toBe(2);
    });

    it('un paso sin requiredControls (Antecedentes médicos) siempre es válido', async () => {
      const { fixture } = await renderWizard();
      expect(fixture.componentInstance.isStepValid(2)).toBe(true);
    });
  });

  describe('goToStep: guardrail de validación al saltar hacia adelante', () => {
    it('saltar varios pasos adelante se detiene en el primer paso inválido del camino', async () => {
      const { fixture } = await renderWizard();

      fixture.componentInstance.goToStep(3);

      expect(fixture.componentInstance.currentStep).toBe(1);
    });

    it('con el paso 1 válido, saltar al paso 3 avanza directo (paso 2 no tiene requisitos)', async () => {
      const { fixture, form } = await renderWizard();
      fillStep1Valid(form);

      fixture.componentInstance.goToStep(3);

      expect(fixture.componentInstance.currentStep).toBe(3);
    });

    it('retroceder a un paso ya visitado es libre, sin importar validez', async () => {
      const { fixture, form } = await renderWizard();
      fillStep1Valid(form);
      fixture.componentInstance.next();

      fixture.componentInstance.goToStep(1);

      expect(fixture.componentInstance.currentStep).toBe(1);
    });

    it('retroceder a un paso NO visitado no hace nada', async () => {
      const { fixture } = await renderWizard();
      fixture.componentInstance.visitedSteps = new Set([2]);
      (fixture.componentInstance as unknown as { currentStep: number }).currentStep = 2;

      fixture.componentInstance.goToStep(1);

      expect(fixture.componentInstance.currentStep).toBe(2);
    });

    it('ir al mismo paso actual no hace nada', async () => {
      const { fixture } = await renderWizard();

      fixture.componentInstance.goToStep(1);

      expect(fixture.componentInstance.currentStep).toBe(1);
    });
  });

  describe('back()', () => {
    it('retrocede al paso anterior', async () => {
      const { fixture, form } = await renderWizard();
      fillStep1Valid(form);
      fixture.componentInstance.next();
      expect(fixture.componentInstance.currentStep).toBe(2);

      fixture.componentInstance.back();

      expect(fixture.componentInstance.currentStep).toBe(1);
    });

    it('no hace nada en el primer paso', async () => {
      const { fixture } = await renderWizard();

      fixture.componentInstance.back();

      expect(fixture.componentInstance.currentStep).toBe(1);
    });
  });

  describe('isStepDone', () => {
    it('un paso visitado, no actual y válido cuenta como hecho', async () => {
      const { fixture, form } = await renderWizard();
      fillStep1Valid(form);
      fixture.componentInstance.next();

      expect(fixture.componentInstance.isStepDone(1)).toBe(true);
      expect(fixture.componentInstance.isStepDone(2)).toBe(false);
    });
  });

  it('llegar al último paso abre el primer grupo de revisión', async () => {
    const { fixture, form } = await renderWizard();
    fillStep1Valid(form);
    fixture.componentInstance.next();
    fixture.componentInstance.next();
    form.patchValue({ coberturaNombre: 'OSDE' });
    fixture.componentInstance.next();

    expect(fixture.componentInstance.currentStep).toBe(5);
    expect(fixture.componentInstance.isLastStep).toBe(true);
    expect(fixture.componentInstance.openAccordionStep).toBe(1);
  });

  it('toggleAccordion abre y cierra el mismo grupo', async () => {
    const { fixture } = await renderWizard();

    fixture.componentInstance.toggleAccordion(2);
    expect(fixture.componentInstance.openAccordionStep).toBe(2);

    fixture.componentInstance.toggleAccordion(2);
    expect(fixture.componentInstance.openAccordionStep).toBeNull();
  });

  describe('formatReviewValue', () => {
    it('sin formatter, devuelve el valor como string', async () => {
      const { fixture, form } = await renderWizard();
      form.patchValue({ nombre: 'Ana' });

      expect(fixture.componentInstance.formatReviewValue({ name: 'nombre', label: 'Nombre' })).toBe('Ana');
    });

    it('con formatter, lo aplica (esTitular: no -> "No")', async () => {
      const { fixture, form } = await renderWizard();
      form.patchValue({ esTitular: 'no' });
      const field: ReviewField = { name: 'esTitular', label: '¿Es titular?', format: (v: string) => (v === 'no' ? 'No' : 'Sí') };

      expect(fixture.componentInstance.formatReviewValue(field)).toBe('No');
    });

    it('valor vacío/null/undefined da string vacío', async () => {
      const { fixture } = await renderWizard();

      expect(fixture.componentInstance.formatReviewValue({ name: 'nombre', label: 'Nombre' })).toBe('');
      expect(fixture.componentInstance.formatReviewValue({ name: 'campoQueNoExiste', label: 'X' })).toBe('');
    });
  });

  describe('getProfesionalLabel / getModuloClinicoLabel', () => {
    it('sin profesionalId/moduloClinicoId seleccionado, devuelve cadena vacía', async () => {
      const { fixture } = await renderWizard();
      expect(fixture.componentInstance.getProfesionalLabel()).toBe('');
      expect(fixture.componentInstance.getModuloClinicoLabel()).toBe('');
    });

    it('con id seleccionado, busca el nombre completo/nombre en las listas de inputs', async () => {
      const { fixture, form } = await renderWizard();
      fixture.componentInstance.profesionales = [{ id: 'pr1', nombre: 'Bruno', apellido: 'Díaz' } as never];
      fixture.componentInstance.clinicalModules = [{ id: 'm1', nombre: 'Odontograma' } as never];
      form.patchValue({ profesionalId: 'pr1', moduloClinicoId: 'm1' });

      expect(fixture.componentInstance.getProfesionalLabel()).toBe('Bruno Díaz');
      expect(fixture.componentInstance.getModuloClinicoLabel()).toBe('Odontograma');
    });
  });

  it('onPatientSelect/onClearPatient emiten los outputs correspondientes', async () => {
    const patientSelect = vi.fn();
    const clearPatient = vi.fn();
    const form = buildWizardForm();
    const { fixture } = await render(PatientWizardComponent, {
      inputs: { form },
      on: { patientSelect, clearPatient },
      providers: [
        { provide: CoberturasService, useValue: { listar: vi.fn(() => of([])) } },
        { provide: AuthService, useValue: createAuthServiceMock({ getCurrentUser: vi.fn(() => ({ organizationPais: 'AR' })) }) }
      ]
    });

    const patient = { id: 'p1', nombre: 'Ana' } as never;
    fixture.componentInstance.onPatientSelect(patient);
    fixture.componentInstance.onClearPatient();

    expect(patientSelect).toHaveBeenCalledWith(patient);
    expect(clearPatient).toHaveBeenCalled();
  });
});
