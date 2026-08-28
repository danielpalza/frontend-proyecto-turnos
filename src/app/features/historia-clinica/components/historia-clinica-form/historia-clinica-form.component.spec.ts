import { render } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import { HistoriaClinicaFormComponent } from './historia-clinica-form.component';
import { HistoriaClinicaStateService } from '../../services/historia-clinica-state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HistoriaClinicaDeltaRequest, HistoriaClinicaResponse } from '../../../../core/models/historia-clinica.model';
import { Capability } from '../../../../core/auth/capabilities';
import { createAuthServiceMock } from '../../../../../testing/auth-service.mock';

function makeMocks(overrides: { editable?: boolean; capabilities?: string[] } = {}) {
  const capabilities = new Set(overrides.capabilities ?? [Capability.TURNOS_MANAGE, Capability.SEGUIMIENTO_PACIENTES]);
  return {
    stateService: {
      editable$: of(overrides.editable ?? true),
      form$: of(null as HistoriaClinicaResponse | null),
      saveDraft: vi.fn((_delta: HistoriaClinicaDeltaRequest) => of({} as HistoriaClinicaResponse)),
      sign: vi.fn((_delta: HistoriaClinicaDeltaRequest) => of({} as HistoriaClinicaResponse))
    },
    authService: createAuthServiceMock({ hasCapability: vi.fn((c: string) => capabilities.has(c)) })
  };
}

async function renderForm(mocks: ReturnType<typeof makeMocks>) {
  return render(HistoriaClinicaFormComponent, {
    providers: [
      { provide: HistoriaClinicaStateService, useValue: mocks.stateService },
      { provide: AuthService, useValue: mocks.authService }
    ]
  });
}

describe('HistoriaClinicaFormComponent', () => {
  describe('canEditPatientData: OR de dos capacidades', () => {
    it.each([
      [[Capability.TURNOS_MANAGE], true],
      [[Capability.SEGUIMIENTO_PACIENTES], true],
      [[Capability.TURNOS_MANAGE, Capability.SEGUIMIENTO_PACIENTES], true],
      [[], false]
    ])('capacidades %j -> %s', async (capabilities, expected) => {
      const mocks = makeMocks({ capabilities: capabilities as string[] });
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.canEditPatientData).toBe(expected);
    });
  });

  describe('applyPatientSectionAccess: gate independiente para "Datos del paciente"/"Antecedentes"', () => {
    it('editable general en true, pero sin canEditPatientData: esos controles quedan deshabilitados', async () => {
      const mocks = makeMocks({ editable: true, capabilities: [] });
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.form.get('nombreCompleto')!.disabled).toBe(true);
      expect(fixture.componentInstance.form.get('alergias')!.disabled).toBe(true);
      // El resto del formulario permanece editable.
      expect(fixture.componentInstance.form.get('motivoConsulta')!.disabled).toBe(false);
    });

    it('editable en false: todo el formulario se deshabilita, incluida la sección de paciente', async () => {
      const mocks = makeMocks({ editable: false, capabilities: [Capability.TURNOS_MANAGE] });
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.form.get('nombreCompleto')!.disabled).toBe(true);
      expect(fixture.componentInstance.form.get('motivoConsulta')!.disabled).toBe(true);
    });

    it('editable=true y con canEditPatientData: la sección de paciente también queda habilitada', async () => {
      const mocks = makeMocks({ editable: true, capabilities: [Capability.TURNOS_MANAGE] });
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.form.get('nombreCompleto')!.disabled).toBe(false);
    });
  });

  describe('buildDelta (vía guardarBorrador): usa .value, los controles deshabilitados quedan fuera del payload', () => {
    it('sin canEditPatientData, el delta no incluye las claves de la sección de paciente', async () => {
      const mocks = makeMocks({ editable: true, capabilities: [] });
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.form.get('motivoConsulta')!.setValue('Dolor');

      fixture.componentInstance.guardarBorrador();

      const sentDelta = mocks.stateService.saveDraft.mock.calls[0][0];
      expect(sentDelta).not.toHaveProperty('nombreCompleto');
      expect(sentDelta).not.toHaveProperty('alergias');
      expect(sentDelta.motivoConsulta).toBe('Dolor');
    });

    it('con canEditPatientData, el delta sí incluye esas claves', async () => {
      const mocks = makeMocks({ editable: true, capabilities: [Capability.TURNOS_MANAGE] });
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.form.patchValue({ motivoConsulta: 'Dolor', nombreCompleto: 'Ana García', dni: '12345678' });

      fixture.componentInstance.guardarBorrador();

      const sentDelta = mocks.stateService.saveDraft.mock.calls[0][0];
      expect(sentDelta.nombreCompleto).toBe('Ana García');
    });
  });

  describe('form$: precarga los datos actuales de la historia clínica', () => {
    it('patchea el form con la respuesta del servicio', async () => {
      const mocks = makeMocks();
      mocks.stateService.form$ = of({ motivoConsulta: 'Control', estado: 'BORRADOR' } as HistoriaClinicaResponse);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.form.value.motivoConsulta).toBe('Control');
      expect(fixture.componentInstance.current?.estado).toBe('BORRADOR');
    });

    it('isFirmado refleja el estado actual', async () => {
      const mocks = makeMocks();
      mocks.stateService.form$ = of({ estado: 'FIRMADO' } as HistoriaClinicaResponse);
      const { fixture } = await renderForm(mocks);

      expect(fixture.componentInstance.isFirmado).toBe(true);
    });
  });

  describe('guardarBorrador', () => {
    it('formulario inválido: marca todo como touched y no llama al servicio', async () => {
      const mocks = makeMocks({ capabilities: [Capability.TURNOS_MANAGE] });
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.form.patchValue({ nombreCompleto: '', dni: '', motivoConsulta: '' });

      fixture.componentInstance.guardarBorrador();

      expect(mocks.stateService.saveDraft).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.get('motivoConsulta')!.touched).toBe(true);
    });

    it('evita doble submit mientras hay un guardado en vuelo', async () => {
      const mocks = makeMocks({ capabilities: [Capability.TURNOS_MANAGE] });
      mocks.stateService.saveDraft.mockReturnValue(new Subject());
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.form.patchValue({ nombreCompleto: 'Ana', dni: '12345678', motivoConsulta: 'Control' });

      fixture.componentInstance.guardarBorrador();
      fixture.componentInstance.guardarBorrador();

      expect(mocks.stateService.saveDraft).toHaveBeenCalledTimes(1);
    });

    it('error: limpia saving y muestra un mensaje de error', async () => {
      const mocks = makeMocks({ capabilities: [Capability.TURNOS_MANAGE] });
      mocks.stateService.saveDraft.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.form.patchValue({ nombreCompleto: 'Ana', dni: '12345678', motivoConsulta: 'Control' });

      fixture.componentInstance.guardarBorrador();

      expect(fixture.componentInstance.saving()).toBe(false);
      expect(fixture.componentInstance.saveError()).toBe('No se pudo guardar el borrador. Intentá de nuevo.');
    });
  });

  describe('confirmarFirma/cancelarFirma', () => {
    it('formulario inválido: no muestra el confirm y marca touched', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderForm(mocks);

      fixture.componentInstance.confirmarFirma();

      expect(fixture.componentInstance.showSignConfirm()).toBe(false);
      expect(fixture.componentInstance.form.get('motivoConsulta')!.touched).toBe(true);
    });

    it('formulario válido: muestra el confirm', async () => {
      const mocks = makeMocks({ capabilities: [Capability.TURNOS_MANAGE] });
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.form.patchValue({ nombreCompleto: 'Ana', dni: '12345678', motivoConsulta: 'Control' });

      fixture.componentInstance.confirmarFirma();

      expect(fixture.componentInstance.showSignConfirm()).toBe(true);
    });

    it('cancelarFirma oculta el confirm', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.showSignConfirm.set(true);

      fixture.componentInstance.cancelarFirma();

      expect(fixture.componentInstance.showSignConfirm()).toBe(false);
    });
  });

  describe('firmarYGuardar', () => {
    it('guarda de re-entrancia: dos llamadas sincrónicas seguidas solo firman una vez', async () => {
      const mocks = makeMocks();
      mocks.stateService.sign.mockReturnValue(new Subject());
      const { fixture } = await renderForm(mocks);

      fixture.componentInstance.firmarYGuardar();
      fixture.componentInstance.firmarYGuardar();

      expect(mocks.stateService.sign).toHaveBeenCalledTimes(1);
    });

    it('éxito: sale de signing y cierra el confirm', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderForm(mocks);
      fixture.componentInstance.showSignConfirm.set(true);

      fixture.componentInstance.firmarYGuardar();

      expect(fixture.componentInstance.signing()).toBe(false);
      expect(fixture.componentInstance.showSignConfirm()).toBe(false);
    });

    it('error: limpia signing y muestra un mensaje de error', async () => {
      const mocks = makeMocks();
      mocks.stateService.sign.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderForm(mocks);

      fixture.componentInstance.firmarYGuardar();

      expect(fixture.componentInstance.signing()).toBe(false);
      expect(fixture.componentInstance.saveError()).toBe('No se pudo firmar la historia clínica. Intentá de nuevo.');
    });
  });
});
