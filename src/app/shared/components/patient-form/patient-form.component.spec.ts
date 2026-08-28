import { render } from '@testing-library/angular';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PatientFormComponent, getPatientFormConfig, COBERTURA_PARTICULAR } from './patient-form.component';
import { CoberturasService } from '../../../features/coberturas/coberturas.service';
import { AuthService } from '../../../core/services/auth.service';
import { createAuthServiceMock } from '../../../../testing/auth-service.mock';

function buildForm() {
  return new FormBuilder().group(getPatientFormConfig(new FormBuilder()));
}

function makeMocks(overrides: { coberturas?: unknown[]; organizationPais?: string } = {}) {
  return {
    coberturasService: {
      listar: vi.fn(() => of(overrides.coberturas ?? []))
    },
    authService: createAuthServiceMock({
      getCurrentUser: vi.fn(() => ({ organizationPais: overrides.organizationPais ?? 'AR' }))
    })
  };
}

async function renderForm(form = buildForm(), mocks = makeMocks()) {
  const result = await render(PatientFormComponent, {
    inputs: { form },
    providers: [
      { provide: CoberturasService, useValue: mocks.coberturasService },
      { provide: AuthService, useValue: mocks.authService }
    ]
  });
  return { ...result, form, mocks };
}

describe('PatientFormComponent', () => {
  describe('cálculo automático de edad desde fechaNacimiento', () => {
    it('una fecha válida en el pasado calcula la edad en años completos', async () => {
      const { form } = await renderForm();
      const today = new Date();
      const birth = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
      form.get('fechaNacimiento')!.setValue(birth.toISOString().slice(0, 10));

      expect(form.get('edad')!.value).toBe('30');
    });

    it('si el cumpleaños de este año todavía no llegó, resta un año', async () => {
      const { form } = await renderForm();
      const today = new Date();
      const birth = new Date(today.getFullYear() - 30, today.getMonth() + 1, today.getDate());
      form.get('fechaNacimiento')!.setValue(birth.toISOString().slice(0, 10));

      expect(form.get('edad')!.value).toBe('29');
    });

    it('una fecha futura limpia la edad en vez de calcular un negativo', async () => {
      const { form } = await renderForm();
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      form.get('fechaNacimiento')!.setValue(future.toISOString().slice(0, 10));

      expect(form.get('edad')!.value).toBe('');
    });

    it('una fecha inválida limpia la edad', async () => {
      const { form } = await renderForm();
      form.get('fechaNacimiento')!.setValue('no-es-una-fecha');

      expect(form.get('edad')!.value).toBe('');
    });

    it('una fecha de más de 150 años atrás limpia la edad (tope de sanidad)', async () => {
      const { form } = await renderForm();
      form.get('fechaNacimiento')!.setValue('1800-01-01');

      expect(form.get('edad')!.value).toBe('');
    });

    it('vaciar fechaNacimiento limpia la edad', async () => {
      const { form } = await renderForm();
      form.get('fechaNacimiento')!.setValue('2000-01-01');
      expect(form.get('edad')!.value).not.toBe('');

      form.get('fechaNacimiento')!.setValue('');
      expect(form.get('edad')!.value).toBe('');
    });
  });

  describe('validadores condicionales de titular', () => {
    it('esTitular=no con cobertura distinta de Particular exige nombreTitular/identificacionTitular/parentesco', async () => {
      const { form } = await renderForm();
      form.patchValue({ coberturaNombre: 'OSDE', esTitular: 'no' });

      expect(form.get('nombreTitular')!.valid).toBe(false);
      expect(form.get('parentesco')!.valid).toBe(false);
      form.get('identificacionTitular')!.setValue('');
      expect(form.get('identificacionTitular')!.valid).toBe(false);
    });

    it('esTitular=si limpia los requeridos de titular (identificacionTitular solo mantiene el validador de formato)', async () => {
      const { form } = await renderForm();
      form.patchValue({ coberturaNombre: 'OSDE', esTitular: 'no' });
      form.patchValue({ esTitular: 'si' });

      expect(form.get('nombreTitular')!.valid).toBe(true);
      expect(form.get('parentesco')!.valid).toBe(true);
      expect(form.get('identificacionTitular')!.valid).toBe(true);
    });

    it('elegir cobertura "Particular" resetea los campos de titular/plan y fuerza esTitular=si', async () => {
      const { form } = await renderForm();
      form.patchValue({ coberturaNombre: 'OSDE', esTitular: 'no', nombreTitular: 'Juan', identificacionTitular: '12345678', parentesco: 'padre' });

      form.get('coberturaNombre')!.setValue(COBERTURA_PARTICULAR);

      expect(form.get('coberturaId')!.value).toBe('');
      expect(form.get('esTitular')!.value).toBe('si');
      expect(form.get('nombreTitular')!.value).toBe('');
      expect(form.get('identificacionTitular')!.value).toBe('');
      expect(form.get('parentesco')!.value).toBe('');
      expect(form.get('nombreTitular')!.valid).toBe(true);
    });
  });

  describe('carga de coberturas', () => {
    it('pide las coberturas del país de la organización del usuario actual y las ordena alfabéticamente', async () => {
      const mocks = makeMocks({
        organizationPais: 'UY',
        coberturas: [
          { id: '2', nombre: 'Zeta Salud', sigla: '' },
          { id: '1', nombre: 'Alfa Salud', sigla: 'ALF' }
        ]
      });
      const { fixture } = await renderForm(buildForm(), mocks);

      expect(mocks.coberturasService.listar).toHaveBeenCalledWith(['UY']);
      expect(fixture.componentInstance.coberturaOptions.map(o => o.value)).toEqual(['ALF', 'Zeta Salud']);
    });

    it('sin organizationPais, usa "AR" como default', async () => {
      const mocks = makeMocks({ organizationPais: undefined });
      mocks.authService.getCurrentUser.mockReturnValue({ organizationPais: undefined } as never);
      await renderForm(buildForm(), mocks);

      expect(mocks.coberturasService.listar).toHaveBeenCalledWith(['AR']);
    });

    it('si el pedido de coberturas falla, coberturaOptions queda vacío en vez de romper el componente', async () => {
      const mocks = makeMocks();
      mocks.coberturasService.listar.mockReturnValue(throwError(() => new Error('caída del servidor')));
      const { fixture } = await renderForm(buildForm(), mocks);

      expect(fixture.componentInstance.coberturaOptions).toEqual([]);
    });
  });

  describe('filteredCoberturaOptions', () => {
    it('siempre incluye "Particular" primero, y filtra por término', async () => {
      const mocks = makeMocks({ coberturas: [{ id: '1', nombre: 'OSDE', sigla: '' }] });
      const { fixture, form } = await renderForm(buildForm(), mocks);

      expect(fixture.componentInstance.filteredCoberturaOptions.map(o => o.value)).toEqual([COBERTURA_PARTICULAR, 'OSDE']);

      form.get('coberturaNombre')!.setValue('osd');
      expect(fixture.componentInstance.filteredCoberturaOptions.map(o => o.value)).toEqual(['OSDE']);
    });
  });

  it('selectCobertura patchea nombre+id y cierra el dropdown', async () => {
    const { fixture, form } = await renderForm();
    fixture.componentInstance.showCoberturaDropdown = true;

    fixture.componentInstance.selectCobertura({ id: 'c1', value: 'OSDE', label: 'OSDE' });

    expect(form.get('coberturaNombre')!.value).toBe('OSDE');
    expect(form.get('coberturaId')!.value).toBe('c1');
    expect(fixture.componentInstance.showCoberturaDropdown).toBe(false);
  });

  it('onCoberturaInput limpia coberturaId y abre el dropdown', async () => {
    const { fixture, form } = await renderForm();
    form.get('coberturaId')!.setValue('c1');

    fixture.componentInstance.onCoberturaInput();

    expect(form.get('coberturaId')!.value).toBe('');
    expect(fixture.componentInstance.showCoberturaDropdown).toBe(true);
  });

  it('onPatientSearchSelect emite patientSelect solo cuando el resultado es de tipo paciente', async () => {
    const patientSelect = vi.fn();
    const { fixture } = await render(PatientFormComponent, {
      inputs: { form: buildForm() },
      on: { patientSelect },
      providers: [
        { provide: CoberturasService, useValue: makeMocks().coberturasService },
        { provide: AuthService, useValue: makeMocks().authService }
      ]
    });

    const patient = { id: 'p1', nombre: 'Ana' };
    fixture.componentInstance.onPatientSearchSelect({ type: 'patient', item: patient } as never);
    expect(patientSelect).toHaveBeenCalledWith(patient);

    patientSelect.mockClear();
    fixture.componentInstance.onPatientSearchSelect({ type: 'profesional', item: {} } as never);
    expect(patientSelect).not.toHaveBeenCalled();
  });

  it('onClearPatient emite clearPatient', async () => {
    const clearPatient = vi.fn();
    const { fixture } = await render(PatientFormComponent, {
      inputs: { form: buildForm() },
      on: { clearPatient },
      providers: [
        { provide: CoberturasService, useValue: makeMocks().coberturasService },
        { provide: AuthService, useValue: makeMocks().authService }
      ]
    });

    fixture.componentInstance.onClearPatient();
    expect(clearPatient).toHaveBeenCalled();
  });

  it('otrosAntecedentesLength refleja el largo del texto, 0 si está vacío/sin form', async () => {
    const { fixture, form } = await renderForm();
    expect(fixture.componentInstance.otrosAntecedentesLength).toBe(0);

    form.get('otrosAntecedentes')!.setValue('hola');
    expect(fixture.componentInstance.otrosAntecedentesLength).toBe(4);
  });
});
