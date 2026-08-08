import { render } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { AppointmentDialogComponent } from './appointment-dialog.component';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { ModuleRulesService } from '../../../../core/services/module-rules.service';
import { CoberturasService } from '../../../coberturas/coberturas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Patient } from '../../../../core/models';

function makeMocks(overrides: { checkAvailability?: boolean } = {}) {
  return {
    appointmentsService: { checkAvailability: vi.fn(() => of(overrides.checkAvailability ?? true)) },
    moduleRulesService: { getClinicalModules: vi.fn(() => of([])) },
    coberturasService: { listar: vi.fn(() => of([])) },
    authService: { getCurrentUser: vi.fn(() => ({ organizationPais: 'AR' })) }
  };
}

async function renderDialog(
  mocks: ReturnType<typeof makeMocks>,
  inputs: Record<string, unknown> = {},
  on: Record<string, (...args: never[]) => void> = {}
) {
  return render(AppointmentDialogComponent, {
    inputs: { open: true, selectedDate: '2026-08-10', ...inputs },
    on,
    providers: [
      { provide: AppointmentsService, useValue: mocks.appointmentsService },
      { provide: ModuleRulesService, useValue: mocks.moduleRulesService },
      { provide: CoberturasService, useValue: mocks.coberturasService },
      { provide: AuthService, useValue: mocks.authService }
    ]
  });
}

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    nombre: 'Ana',
    apellido: 'García',
    identificacion: '12345678',
    coberturaNombre: 'OSDE',
    ...overrides
  } as Patient;
}

describe('AppointmentDialogComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setupHoraAvailabilityValidation (regresión DEUDA § 4.1)', () => {
    it('sin profesional/fecha/hora, no llama al servicio y limpia el error', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.get('hora')!.setValue('10:00');

      expect(mocks.appointmentsService.checkAvailability).not.toHaveBeenCalled();
      expect(fixture.componentInstance.availabilityError).toBeNull();
    });

    it('con profesional+fecha+hora válidos: llama checkAvailability con la hora normalizada a HH:mm:ss', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks({ checkAvailability: true });
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ profesionalId: 'pr1' });
      fixture.componentInstance.form.get('hora')!.setValue('10:00');

      await vi.advanceTimersByTimeAsync(300);

      expect(mocks.appointmentsService.checkAvailability).toHaveBeenCalledWith('pr1', '2026-08-10', '10:00:00');
      expect(fixture.componentInstance.isCheckingAvailability).toBe(false);
      expect(fixture.componentInstance.availabilityError).toBeNull();
    });

    it('el debounce de 300ms evita llamadas por cada tecla: solo se dispara una vez tras asentarse', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ profesionalId: 'pr1' });

      fixture.componentInstance.form.get('hora')!.setValue('1');
      await vi.advanceTimersByTimeAsync(100);
      fixture.componentInstance.form.get('hora')!.setValue('10');
      await vi.advanceTimersByTimeAsync(100);
      fixture.componentInstance.form.get('hora')!.setValue('10:00');
      expect(mocks.appointmentsService.checkAvailability).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(300);

      expect(mocks.appointmentsService.checkAvailability).toHaveBeenCalledTimes(1);
    });

    it('horario ocupado (available=false): setea el mensaje de error para que la UI lo pueda mostrar', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks({ checkAvailability: false });
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ profesionalId: 'pr1' });
      fixture.componentInstance.form.get('hora')!.setValue('10:00');

      await vi.advanceTimersByTimeAsync(300);

      expect(fixture.componentInstance.availabilityError).toBe('Este horario ya está ocupado. Por favor, seleccione otro horario.');
    });

    it('formato de hora inválido: error de formato sin llamar al servicio', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ profesionalId: 'pr1' });
      fixture.componentInstance.form.get('hora')!.setValue('25:99');

      await vi.advanceTimersByTimeAsync(300);

      expect(mocks.appointmentsService.checkAvailability).not.toHaveBeenCalled();
      expect(fixture.componentInstance.availabilityError).toBe('Formato de hora inválido. Use HH:mm.');
    });

    it('un error de red al chequear disponibilidad no bloquea al usuario (se traga el error, sin mensaje)', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks();
      mocks.appointmentsService.checkAvailability.mockReturnValue(throwError(() => new Error('caída de red')));
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ profesionalId: 'pr1' });
      fixture.componentInstance.form.get('hora')!.setValue('10:00');

      await vi.advanceTimersByTimeAsync(300);

      expect(fixture.componentInstance.availabilityError).toBeNull();
      expect(fixture.componentInstance.isCheckingAvailability).toBe(false);
    });
  });

  describe('selectPatient / clearPatientSelection', () => {
    it('parsea anamnesis JSON string y llena el formulario, deshabilitando los campos de paciente', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      const p = patient({ anamnesis: JSON.stringify({ alergias: 'Penicilina' }) });

      fixture.componentInstance.selectPatient(p);

      expect(fixture.componentInstance.form.get('alergias')!.value).toBe('Penicilina');
      expect(fixture.componentInstance.form.get('nombre')!.disabled).toBe(true);
      expect(fixture.componentInstance.selectedPatient).toBe(p);
      expect(fixture.componentInstance.isNewPatient).toBe(false);
    });

    it('acepta anamnesis ya como objeto (no string)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      const p = patient({ anamnesis: { alergias: 'Ibuprofeno' } as unknown as string });

      fixture.componentInstance.selectPatient(p);

      expect(fixture.componentInstance.form.get('alergias')!.value).toBe('Ibuprofeno');
    });

    it('anamnesis con JSON inválido no rompe: se trata como vacío', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      const p = patient({ anamnesis: '{esto no es json' });

      expect(() => fixture.componentInstance.selectPatient(p)).not.toThrow();
      expect(fixture.componentInstance.form.get('alergias')!.value).toBe('');
    });

    it('coberturaNombre "Particular" fuerza esTitular=si aunque el paciente no tenga esTitular', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      const p = patient({ coberturaNombre: 'Particular', esTitular: false });

      fixture.componentInstance.selectPatient(p);

      expect(fixture.componentInstance.form.get('esTitular')!.value).toBe('si');
    });

    it('clearPatientSelection reactiva los campos y resetea al snapshot de construcción (getRawValue)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.selectPatient(patient());

      fixture.componentInstance.clearPatientSelection();

      expect(fixture.componentInstance.selectedPatient).toBeNull();
      expect(fixture.componentInstance.isNewPatient).toBe(true);
      expect(fixture.componentInstance.form.get('nombre')!.disabled).toBe(false);
      expect(fixture.componentInstance.form.get('nombre')!.value).toBe('');
      expect(fixture.componentInstance.form.get('hora')!.value).toBe('09:00');
    });
  });

  describe('ngOnChanges: limpieza de paciente solo en la transición open true→false', () => {
    it('cerrar el diálogo (true→false) limpia la selección de paciente', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.selectPatient(patient());

      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedPatient).toBeNull();
    });

    it('abrir el diálogo (false→true) NO limpia nada', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks, { open: false });
      fixture.componentInstance.selectPatient(patient());

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedPatient).not.toBeNull();
    });
  });

  describe('calcularResto', () => {
    it('suma bono+tratamiento+extras y resta lo pagado', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ precioBono: 1000, precioTratamiento: 500, extras: 100, montoPago: 300 });

      expect(fixture.componentInstance.calcularResto()).toBe(1300);
    });

    it('si se pagó de más, el resto no baja de 0', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ precioBono: 100, precioTratamiento: 0, extras: 0, montoPago: 500 });

      expect(fixture.componentInstance.calcularResto()).toBe(0);
    });

    it('valores nulos/inválidos se tratan como 0', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks);
      fixture.componentInstance.form.patchValue({ precioBono: null, precioTratamiento: 'no-es-numero', extras: -50, montoPago: undefined });

      expect(fixture.componentInstance.calcularResto()).toBe(0);
    });
  });

  describe('onSubmit', () => {
    function fillValidForm(fixture: { componentInstance: AppointmentDialogComponent }) {
      fixture.componentInstance.form.patchValue({
        nombre: '  Ana  ',
        apellido: 'García',
        identificacion: '12345678',
        telefono: '1122334455',
        email: 'ana@test.com',
        domicilio: 'Calle 123',
        localidad: 'CABA',
        coberturaNombre: 'Particular',
        moduloClinicoId: 'mod1',
        hora: '10:00'
      });
    }

    it('formulario inválido: marca todos los controles como touched y no emite submitForm', async () => {
      const mocks = makeMocks();
      const submitForm = vi.fn();
      const { fixture } = await renderDialog(mocks, {}, { submitForm });

      fixture.componentInstance.onSubmit();

      expect(submitForm).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.get('nombre')!.touched).toBe(true);
    });

    it('formulario válido: hace trim de los campos personales y emite submitForm con los datos mapeados', async () => {
      const mocks = makeMocks();
      const submitForm = vi.fn();
      const { fixture } = await renderDialog(mocks, {}, { submitForm });
      fillValidForm(fixture);

      fixture.componentInstance.onSubmit();

      expect(fixture.componentInstance.form.get('nombre')!.value).toBe('Ana');
      expect(submitForm).toHaveBeenCalledTimes(1);
      const emitted = submitForm.mock.calls[0][0];
      expect(emitted.patientData.nombre).toBe('Ana');
      expect(emitted.patientData.esTitular).toBe(true);
      expect(emitted.appointmentData.fecha).toBe('2026-08-10');
      expect(emitted.appointmentData.hora).toBe('10:00:00');
      expect(emitted.appointmentData.moduloClinicoId).toBe('mod1');
      expect(emitted.appointmentData.estado).toBe('PENDIENTE');
    });

    it('el objeto anamnesis solo incluye los campos con datos, y va serializado como string', async () => {
      const mocks = makeMocks();
      const submitForm = vi.fn();
      const { fixture } = await renderDialog(mocks, {}, { submitForm });
      fillValidForm(fixture);
      fixture.componentInstance.form.patchValue({ alergias: 'Penicilina' });

      fixture.componentInstance.onSubmit();

      const emitted = submitForm.mock.calls[0][0];
      expect(JSON.parse(emitted.patientData.anamnesis)).toEqual({ alergias: 'Penicilina' });
    });

    it('sin ningún antecedente cargado, anamnesis queda undefined (no un JSON de objeto vacío)', async () => {
      const mocks = makeMocks();
      const submitForm = vi.fn();
      const { fixture } = await renderDialog(mocks, {}, { submitForm });
      fillValidForm(fixture);

      fixture.componentInstance.onSubmit();

      const emitted = submitForm.mock.calls[0][0];
      expect(emitted.patientData.anamnesis).toBeUndefined();
    });
  });

  describe('close', () => {
    it('con isLoading=true, no hace nada', async () => {
      const mocks = makeMocks();
      const openChange = vi.fn();
      const { fixture } = await renderDialog(mocks, { isLoading: true }, { openChange });

      fixture.componentInstance.close();

      expect(openChange).not.toHaveBeenCalled();
    });

    it('sin isLoading, cierra, emite openChange(false) y limpia la selección de paciente', async () => {
      const mocks = makeMocks();
      const openChange = vi.fn();
      const { fixture } = await renderDialog(mocks, {}, { openChange });
      fixture.componentInstance.selectPatient(patient());

      fixture.componentInstance.close();

      expect(openChange).toHaveBeenCalledWith(false);
      expect(fixture.componentInstance.selectedPatient).toBeNull();
    });
  });

  it('formatDisplayDate: cadena vacía sin fecha', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderDialog(mocks);
    expect(fixture.componentInstance.formatDisplayDate(null)).toBe('');
  });
});
