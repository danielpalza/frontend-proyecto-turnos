import { render } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { SeguimientoViewComponent } from './seguimiento-view.component';
import { PatientDataService, PatientGroup } from './patient-data.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientService } from '../../../core/services/patient.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { CoberturasService } from '../../coberturas/coberturas.service';
import { OdontogramaService } from '../../../core/services/odontograma.service';
import { PeriodontogramaService } from '../../../core/services/periodontograma.service';
import { ModuleRulesService } from '../../../core/services/module-rules.service';
import { Appointment, Patient } from '../../../core/models';

function patient(overrides: Partial<Patient> = {}): Patient {
  return { id: 'p1', nombre: 'Ana', apellido: 'García', identificacion: '12345678', ...overrides } as Patient;
}

function group(overrides: Partial<PatientGroup> = {}): PatientGroup {
  return {
    patient: patient(),
    appointments: [],
    totalAdeudado: 0,
    totalTurnos: 0,
    availableYears: ['2026'],
    ...overrides
  };
}

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-10', estado: 'PENDIENTE', ...overrides } as Appointment;
}

function makePatientDataMock() {
  return {
    patients: [] as Patient[],
    patientGroups: [] as PatientGroup[],
    patientsMap: new Map<string, Patient>(),
    searchTerm: '',
    setPatients: vi.fn(),
    setResumen: vi.fn(),
    refreshResumen: vi.fn(() => of(undefined)),
    updateCachedAppointment: vi.fn(),
    currentYear: vi.fn(() => '2026'),
    loadYear: vi.fn(() => of([] as Appointment[])),
    ensureAllYearsLoaded: vi.fn(() => of(null)),
    updatePatientGroups: vi.fn(),
    getSelectedYear: vi.fn(() => '2026'),
    getSelectedMonth: vi.fn(() => 'all'),
    onYearFilterChange: vi.fn((_id: string, _v: string) => of(null)),
    onMonthFilterChange: vi.fn(),
    getAvailableMonths: vi.fn(() => []),
    getFilteredAppointments: vi.fn((g: PatientGroup) => g.appointments)
  };
}

function makeMocks() {
  return {
    patientData: makePatientDataMock(),
    appointmentsService: {
      getSeguimientoResumen: vi.fn(() => of([])),
      addPaymentWithFeedback: vi.fn(() => of(appt())),
      updateWithFeedback: vi.fn(() => of(appt()))
    },
    patientService: { getPatients: vi.fn(() => of([] as Patient[])) },
    notification: { showError: vi.fn(), showSuccess: vi.fn() },
    errorHandler: {
      getErrorMessage: vi.fn((_e: unknown, ctx: string) => `Error al ${ctx}`),
      isNetworkError: vi.fn(() => false)
    },
    authService: {
      hasCapability: vi.fn(() => true),
      currentUser$: of({}),
      getCurrentUser: vi.fn(() => ({ organizationPais: 'AR' }))
    },
    configurationService: { buildWhatsAppLink: vi.fn(() => 'https://wa.me/123') },
    coberturasService: { listar: vi.fn(() => of([])) },
    odontogramaService: { getByAppointment: vi.fn(() => of(null)) },
    periodontogramaService: { getByAppointment: vi.fn(() => of(null)) },
    moduleRulesService: { getClinicalModules: vi.fn(() => of([])) },
    router: { navigate: vi.fn() }
  };
}

async function renderView(mocks: ReturnType<typeof makeMocks>) {
  return render(SeguimientoViewComponent, {
    componentProviders: [{ provide: PatientDataService, useValue: mocks.patientData }],
    providers: [
      { provide: AppointmentsService, useValue: mocks.appointmentsService },
      { provide: PatientService, useValue: mocks.patientService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler },
      { provide: AuthService, useValue: mocks.authService },
      { provide: ConfigurationService, useValue: mocks.configurationService },
      { provide: CoberturasService, useValue: mocks.coberturasService },
      { provide: OdontogramaService, useValue: mocks.odontogramaService },
      { provide: PeriodontogramaService, useValue: mocks.periodontogramaService },
      { provide: ModuleRulesService, useValue: mocks.moduleRulesService },
      { provide: Router, useValue: mocks.router }
    ]
  });
}

describe('SeguimientoViewComponent', () => {
  afterEach(() => {
    document.documentElement.classList.remove('seguimiento-view-active');
  });

  describe('ngOnInit', () => {
    it('agrega la clase global al montar y la saca al destruirse', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      expect(document.documentElement.classList.contains('seguimiento-view-active')).toBe(true);

      fixture.destroy();

      expect(document.documentElement.classList.contains('seguimiento-view-active')).toBe(false);
    });

    it('camino feliz: resumen+pacientes -> loadYear -> updatePatientGroups se llama una sola vez', async () => {
      const mocks = makeMocks();
      const patients = [patient()];
      mocks.patientService.getPatients.mockReturnValue(of(patients));

      await renderView(mocks);

      expect(mocks.patientData.setPatients).toHaveBeenCalledWith(patients);
      expect(mocks.patientData.setResumen).toHaveBeenCalled();
      expect(mocks.patientData.loadYear).toHaveBeenCalledWith('2026');
      expect(mocks.patientData.updatePatientGroups).toHaveBeenCalledTimes(1);
    });

    it('error 404 al cargar: se ignora en silencio, sin toast', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.getSeguimientoResumen.mockReturnValue(throwError(() => ({ status: 404 })));
      await renderView(mocks);

      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });

    it('otro error: dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.getSeguimientoResumen.mockReturnValue(throwError(() => ({ status: 500 })));
      await renderView(mocks);

      expect(mocks.notification.showError).toHaveBeenCalledWith('Error al cargar los datos');
    });
  });

  describe('onYearFilterChange: descarta respuestas de filtro fuera de orden, por paciente (independiente entre pacientes)', () => {
    it('una respuesta vieja del paciente A no pisa una más nueva del mismo paciente', async () => {
      const mocks = makeMocks();
      const responses: Subject<null>[] = [new Subject(), new Subject()];
      let call = 0;
      mocks.patientData.onYearFilterChange.mockImplementation(() => responses[call++] as never);
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onYearFilterChange('12345678', '2025');
      fixture.componentInstance.onYearFilterChange('12345678', '2024');
      mocks.patientData.updatePatientGroups.mockClear();

      responses[0].next(null); // respuesta vieja (del primer cambio) llega después
      expect(mocks.patientData.updatePatientGroups).not.toHaveBeenCalled();

      responses[1].next(null); // respuesta del segundo cambio (la vigente)
      expect(mocks.patientData.updatePatientGroups).toHaveBeenCalledTimes(1);
    });

    it('los contadores de secuencia son independientes entre pacientes distintos', async () => {
      const mocks = makeMocks();
      const mainSubject = new Subject<null>();
      mocks.patientData.onYearFilterChange.mockImplementation((id: string) => (id === 'pA' ? mainSubject : of(null)) as never);
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onYearFilterChange('pA', '2025');
      fixture.componentInstance.onYearFilterChange('pB', '2024');
      mocks.patientData.updatePatientGroups.mockClear();

      mainSubject.next(null);

      expect(mocks.patientData.updatePatientGroups).toHaveBeenCalledTimes(1);
    });

    it('sin identificacion, no hace nada', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onYearFilterChange(null, '2025');

      expect(mocks.patientData.onYearFilterChange).not.toHaveBeenCalled();
    });
  });

  describe('onMonthFilterChange', () => {
    it('delega en el servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onMonthFilterChange('12345678', '08');

      expect(mocks.patientData.onMonthFilterChange).toHaveBeenCalledWith('12345678', '08');
    });

    it('sin identificacion, no hace nada', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onMonthFilterChange(undefined, '08');

      expect(mocks.patientData.onMonthFilterChange).not.toHaveBeenCalled();
    });
  });

  describe('modales de turno (pago y resumen clínico)', () => {
    it('openTurnModal/closeTurnModal', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const a = appt();

      fixture.componentInstance.openTurnModal(a);
      expect(fixture.componentInstance.showTurnModal).toBe(true);
      expect(fixture.componentInstance.selectedAppointment).toBe(a);

      fixture.componentInstance.closeTurnModal();
      expect(fixture.componentInstance.showTurnModal).toBe(false);
      expect(fixture.componentInstance.selectedAppointment).toBeNull();
    });

    it('openClinicalModal/closeClinicalModal', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const a = appt();

      fixture.componentInstance.openClinicalModal(a);
      expect(fixture.componentInstance.showClinicalModal).toBe(true);
      expect(fixture.componentInstance.selectedAppointment).toBe(a);

      fixture.componentInstance.closeClinicalModal();
      expect(fixture.componentInstance.showClinicalModal).toBe(false);
      expect(fixture.componentInstance.selectedAppointment).toBeNull();
    });

    it('selectedAppointmentPatient resuelve el paciente del turno seleccionado por identificacion', async () => {
      const mocks = makeMocks();
      const p = patient({ identificacion: '999' });
      mocks.patientData.patientsMap.set('999', p);
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.openTurnModal(appt({ patientIdentificacion: '999' }));

      expect(fixture.componentInstance.selectedAppointmentPatient).toBe(p);
    });

    it('onAppointmentUpdated actualiza el cache y refresca el resumen', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const updated = appt({ id: 'a1' });

      fixture.componentInstance.onAppointmentUpdated(updated);

      expect(mocks.patientData.updateCachedAppointment).toHaveBeenCalledWith(updated);
      expect(mocks.patientData.refreshResumen).toHaveBeenCalled();
    });
  });

  describe('getCoberturaInfo', () => {
    it('combina cobertura, plan y número cuando están presentes', async () => {
      const mocks = makeMocks();
      const p = patient({ identificacion: '999', coberturaNombre: 'OSDE', planCategoria: '310', coberturaNumero: 'AB123' });
      mocks.patientData.patientsMap.set('999', p);
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.getCoberturaInfo('999')).toBe('OSDE 310 (AB123)');
    });

    it('sin datos de cobertura, devuelve cadena vacía', async () => {
      const mocks = makeMocks();
      const p = patient({ identificacion: '999' });
      mocks.patientData.patientsMap.set('999', p);
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.getCoberturaInfo('999')).toBe('');
    });

    it('sin encontrar al paciente, devuelve cadena vacía', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      expect(fixture.componentInstance.getCoberturaInfo('no-existe')).toBe('');
    });
  });

  describe('editPatientFromGroup / openNewPatientWizard (vía @ViewChild real)', () => {
    it('editPatientFromGroup abre el wizard en modo edición con el paciente del grupo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      const g = group({ patient: patient({ id: 'p1' }) });

      fixture.componentInstance.editPatientFromGroup(g);

      expect(fixture.componentInstance.wizardPanel.isOpen).toBe(true);
      expect(fixture.componentInstance.wizardPanel.selectedPatientForForm).toBe(g.patient);
    });

    it('openNewPatientWizard abre el wizard limpio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.openNewPatientWizard();

      expect(fixture.componentInstance.wizardPanel.isOpen).toBe(true);
      expect(fixture.componentInstance.wizardPanel.selectedPatientForForm).toBeNull();
    });
  });

  it('onSearchChange delega en updatePatientGroups', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderView(mocks);
    mocks.patientData.updatePatientGroups.mockClear();

    fixture.componentInstance.onSearchChange();

    expect(mocks.patientData.updatePatientGroups).toHaveBeenCalledTimes(1);
  });
});
