import { render } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { SeguimientoViewComponent } from './seguimiento-view.component';
import { PatientDataService } from './patient-data.service';
import { PatientService } from '../../../core/services/patient.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { CoberturasService } from '../../coberturas/coberturas.service';
import { OdontogramaService } from '../../../core/services/odontograma.service';
import { PeriodontogramaService } from '../../../core/services/periodontograma.service';
import { ModuleRulesService } from '../../../core/services/module-rules.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { Appointment, Patient, SeguimientoPatientGroup } from '../../../core/models';

function patient(overrides: Partial<Patient> = {}): Patient {
  return { id: 'p1', nombre: 'Ana', apellido: 'García', identificacion: '12345678', ...overrides } as Patient;
}

function group(overrides: Partial<SeguimientoPatientGroup> = {}): SeguimientoPatientGroup {
  return {
    patient: patient(),
    appointments: [],
    totalAdeudado: 0,
    totalTurnos: 0,
    ...overrides
  };
}

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-10', estado: 'PENDIENTE', ...overrides } as Appointment;
}

function makePatientDataMock() {
  return {
    desde: '',
    hasta: '',
    page: 0,
    size: 20,
    searchTerm: '',
    patientGroups: [] as SeguimientoPatientGroup[],
    patientsMap: new Map<string, Patient>(),
    totalPages: 0,
    totalElements: 0,
    cargando: false,
    loadPage: vi.fn(() => of(undefined))
  };
}

function makeMocks() {
  return {
    patientData: makePatientDataMock(),
    appointmentsService: {
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

    it('setea desde=hoy y hasta=hoy+30 dias por defecto, y carga la primera pagina una sola vez', async () => {
      const mocks = makeMocks();

      await renderView(mocks);

      expect(mocks.patientData.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(mocks.patientData.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(mocks.patientData.desde < mocks.patientData.hasta).toBe(true);
      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);
    });

    it('puebla `patients` desde PatientService, para el chequeo de duplicados del wizard', async () => {
      const mocks = makeMocks();
      const patients = [patient()];
      mocks.patientService.getPatients.mockReturnValue(of(patients));

      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.patients).toEqual(patients);
    });

    it('error 404 al cargar la pagina: se ignora en silencio, sin toast', async () => {
      const mocks = makeMocks();
      mocks.patientData.loadPage.mockReturnValue(throwError(() => ({ status: 404 })));

      await renderView(mocks);

      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });

    it('otro error al cargar la pagina: dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.patientData.loadPage.mockReturnValue(throwError(() => ({ status: 500 })));

      await renderView(mocks);

      expect(mocks.notification.showError).toHaveBeenCalledWith('Error al cargar los datos');
    });
  });

  describe('buscador con debounce', () => {
    it('cambiar el termino de busqueda no recarga hasta pasado el debounce, y resetea a pagina 0', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      mocks.patientData.page = 3;
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.searchTerm = 'ana';
      expect(mocks.patientData.loadPage).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(mocks.patientData.searchTerm).toBe('ana');
      expect(mocks.patientData.page).toBe(0);
      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('varias teclas seguidas antes de que venza el debounce disparan una sola carga', async () => {
      vi.useFakeTimers();
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.searchTerm = 'a';
      vi.advanceTimersByTime(100);
      fixture.componentInstance.searchTerm = 'an';
      vi.advanceTimersByTime(100);
      fixture.componentInstance.searchTerm = 'ana';
      vi.advanceTimersByTime(300);

      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('onDesdeChange / onHastaChange', () => {
    it('onDesdeChange actualiza desde, resetea la pagina y recarga', async () => {
      const mocks = makeMocks();
      mocks.patientData.page = 2;
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.onDesdeChange('2026-01-01');

      expect(mocks.patientData.desde).toBe('2026-01-01');
      expect(mocks.patientData.page).toBe(0);
      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);
    });

    it('onHastaChange actualiza hasta, resetea la pagina y recarga', async () => {
      const mocks = makeMocks();
      mocks.patientData.page = 2;
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.onHastaChange('2026-12-31');

      expect(mocks.patientData.hasta).toBe('2026-12-31');
      expect(mocks.patientData.page).toBe(0);
      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('paginación', () => {
    it('goToNextPage incrementa la página y recarga', async () => {
      const mocks = makeMocks();
      mocks.patientData.totalPages = 3;
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.goToNextPage();

      expect(mocks.patientData.page).toBe(1);
      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);
    });

    it('goToNextPage no hace nada en la última página', async () => {
      const mocks = makeMocks();
      mocks.patientData.page = 2;
      mocks.patientData.totalPages = 3;
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.goToNextPage();

      expect(mocks.patientData.page).toBe(2);
      expect(mocks.patientData.loadPage).not.toHaveBeenCalled();
    });

    it('goToPreviousPage no hace nada en la primera página', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.goToPreviousPage();

      expect(mocks.patientData.page).toBe(0);
      expect(mocks.patientData.loadPage).not.toHaveBeenCalled();
    });

    it('goToPreviousPage decrementa cuando no está en la primera página', async () => {
      const mocks = makeMocks();
      mocks.patientData.page = 2;
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.goToPreviousPage();

      expect(mocks.patientData.page).toBe(1);
      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);
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

    it('onAppointmentUpdated recarga la página actual', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.onAppointmentUpdated(appt({ id: 'a1' }));

      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);
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

    it('onPatientSaved (evento del wizard) recarga la página actual', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      mocks.patientData.loadPage.mockClear();

      fixture.componentInstance.onPatientSaved();

      expect(mocks.patientData.loadPage).toHaveBeenCalledTimes(1);
    });
  });
});
