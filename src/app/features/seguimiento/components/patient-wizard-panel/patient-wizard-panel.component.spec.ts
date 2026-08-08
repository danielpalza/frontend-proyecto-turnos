import { render } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { PatientWizardPanelComponent } from './patient-wizard-panel.component';
import { PatientService } from '../../../../core/services/patient.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { CoberturasService } from '../../../coberturas/coberturas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Patient } from '../../../../core/models';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1', nombre: 'Ana', apellido: 'García', identificacion: '12345678',
    coberturaNombre: 'OSDE', ...overrides
  } as Patient;
}

function makeMocks() {
  return {
    patientService: {
      create: vi.fn((p: Partial<Patient>, _skip?: boolean) => of({ ...p, id: 'p-new' } as Patient)),
      update: vi.fn((id: string, p: Partial<Patient>) => of({ ...p, id } as Patient))
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    errorHandler: {
      getErrorMessage: vi.fn((_e: unknown, ctx: string) => `Error al ${ctx}`),
      isNetworkError: vi.fn(() => false)
    },
    coberturasService: { listar: vi.fn(() => of([])) },
    authService: { getCurrentUser: vi.fn(() => ({ organizationPais: 'AR' })) }
  };
}

async function renderPanel(mocks: ReturnType<typeof makeMocks>) {
  return render(PatientWizardPanelComponent, {
    providers: [
      { provide: PatientService, useValue: mocks.patientService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler },
      { provide: CoberturasService, useValue: mocks.coberturasService },
      { provide: AuthService, useValue: mocks.authService }
    ]
  });
}

describe('PatientWizardPanelComponent', () => {
  describe('openNew / openEdit / close', () => {
    it('openNew limpia el form y abre el wizard sin paciente seleccionado', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.openNew();

      expect(fixture.componentInstance.isOpen).toBe(true);
      expect(fixture.componentInstance.selectedPatientForForm).toBeNull();
    });

    it('openEdit precarga el paciente y abre el wizard', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      const p = patient();

      fixture.componentInstance.openEdit(p);

      expect(fixture.componentInstance.isOpen).toBe(true);
      expect(fixture.componentInstance.selectedPatientForForm).toBe(p);
      expect(fixture.componentInstance.patientForm.value.nombre).toBe('Ana');
    });

    it('close cierra el wizard Y limpia la selección (no solo isOpen)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.openEdit(patient());

      fixture.componentInstance.close();

      expect(fixture.componentInstance.isOpen).toBe(false);
      expect(fixture.componentInstance.selectedPatientForForm).toBeNull();
      // reset() con un objeto parcial deja en null los controles no listados explícitamente
      // (no vuelven a su default de construcción) — comportamiento real de Angular reactive forms.
      expect(fixture.componentInstance.patientForm.value.nombre).toBeNull();
      expect(fixture.componentInstance.patientForm.value.esTitular).toBe('si');
    });
  });

  describe('loadPatientIntoForm (vía openEdit/onPatientFormSelect): parseo de anamnesis', () => {
    it('anamnesis como string JSON se parsea correctamente', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.openEdit(patient({ anamnesis: JSON.stringify({ alergias: 'Penicilina' }) }));

      expect(fixture.componentInstance.patientForm.value.alergias).toBe('Penicilina');
    });

    it('anamnesis ya como objeto también funciona', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.openEdit(patient({ anamnesis: { alergias: 'Ibuprofeno' } as unknown as string }));

      expect(fixture.componentInstance.patientForm.value.alergias).toBe('Ibuprofeno');
    });

    it('anamnesis con JSON inválido no rompe: se trata como vacía', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      expect(() => fixture.componentInstance.openEdit(patient({ anamnesis: '{esto no es json' }))).not.toThrow();
      expect(fixture.componentInstance.patientForm.value.alergias).toBe('');
    });

    it('onPatientFormSelect delega en el mismo precargado que openEdit', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      const p = patient({ nombre: 'Bruno' });

      fixture.componentInstance.onPatientFormSelect(p);

      expect(fixture.componentInstance.selectedPatientForForm).toBe(p);
      expect(fixture.componentInstance.patientForm.value.nombre).toBe('Bruno');
    });

    it('coberturaNombre "Particular" fuerza esTitular=si aunque el paciente no tenga esTitular', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.openEdit(patient({ coberturaNombre: 'Particular', esTitular: false }));

      expect(fixture.componentInstance.patientForm.value.esTitular).toBe('si');
    });
  });

  describe('savePatient', () => {
    function fillRequired(fixture: { componentInstance: PatientWizardPanelComponent }) {
      fixture.componentInstance.patientForm.patchValue({
        nombre: '  Ana  ',
        apellido: 'García',
        identificacion: '12345678',
        telefono: '1122334455',
        email: 'ana@test.com',
        domicilio: 'Calle 123',
        localidad: 'CABA',
        coberturaNombre: 'Particular'
      });
    }

    it('formulario inválido: marca todo como touched y no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.savePatient();

      expect(mocks.patientService.create).not.toHaveBeenCalled();
      expect(fixture.componentInstance.patientForm.get('nombre')!.touched).toBe(true);
    });

    it('formulario válido, paciente nuevo: hace trim antes de enviar y llama a create()', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fillRequired(fixture);

      fixture.componentInstance.savePatient();

      // El envío exitoso cierra el wizard (y resetea el form) de forma sincrónica, ya que el mock
      // responde con `of(...)` — por eso el trim se verifica contra lo que recibió create(), no
      // releyendo patientForm.value después de llamar a savePatient().
      expect(mocks.patientService.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Ana' }), true);
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Paciente creado correctamente.');
    });

    it('paciente existente (selectedPatientForForm con id): llama a update() en vez de create()', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.openEdit(patient({ id: 'p1' }));
      fillRequired(fixture);

      fixture.componentInstance.savePatient();

      expect(mocks.patientService.update).toHaveBeenCalledWith('p1', expect.anything());
      expect(mocks.patientService.create).not.toHaveBeenCalled();
      expect(mocks.notification.showSuccess).toHaveBeenCalledWith('Paciente actualizado correctamente.');
    });

    it('evita doble submit mientras hay un guardado en vuelo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fillRequired(fixture);
      fixture.componentInstance.isSavingPatient = true;

      fixture.componentInstance.savePatient();

      expect(mocks.patientService.create).not.toHaveBeenCalled();
    });

    it('éxito: cierra el wizard (y por lo tanto limpia la selección)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.openEdit(patient({ id: 'p1' }));
      fillRequired(fixture);

      fixture.componentInstance.savePatient();

      expect(fixture.componentInstance.isOpen).toBe(false);
      expect(fixture.componentInstance.selectedPatientForForm).toBeNull();
    });

    it('el objeto anamnesis solo incluye campos con datos, serializado como string', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fillRequired(fixture);
      fixture.componentInstance.patientForm.patchValue({ alergias: 'Penicilina' });

      fixture.componentInstance.savePatient();

      const sentData = mocks.patientService.create.mock.calls[0][0];
      expect(JSON.parse(sentData.anamnesis as string)).toEqual({ alergias: 'Penicilina' });
    });

    it('sin ningún antecedente, anamnesis queda undefined (no un JSON vacío)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fillRequired(fixture);

      fixture.componentInstance.savePatient();

      const sentData = mocks.patientService.create.mock.calls[0][0];
      expect(sentData.anamnesis).toBeUndefined();
    });

    it('error: guarda el mensaje, dispara el toast (salvo error de red) y NO cierra el wizard', async () => {
      const mocks = makeMocks();
      mocks.patientService.create.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.openNew();
      fillRequired(fixture);

      fixture.componentInstance.savePatient();

      expect(fixture.componentInstance.patientFormError).toBe('Error al crear el paciente');
      expect(mocks.notification.showError).toHaveBeenCalledWith('Error al crear el paciente');
      expect(fixture.componentInstance.isSavingPatient).toBe(false);
      // El error no cierra el wizard: el usuario puede corregir y reintentar.
      expect(fixture.componentInstance.isOpen).toBe(true);
    });

    it('error de red: no dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.errorHandler.isNetworkError.mockReturnValue(true);
      mocks.patientService.create.mockReturnValue(throwError(() => new Error('caída de red')));
      const { fixture } = await renderPanel(mocks);
      fillRequired(fixture);

      fixture.componentInstance.savePatient();

      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });
  });
});
