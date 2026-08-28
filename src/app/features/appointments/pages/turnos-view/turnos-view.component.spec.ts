import { render } from '@testing-library/angular';
import { of, throwError, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { TurnosViewComponent } from './turnos-view.component';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { PatientService } from '../../../../core/services/patient.service';
import { ProfesionalService } from '../../../../core/services/profesional.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ModuleRulesService } from '../../../../core/services/module-rules.service';
import { ConfigurationService } from '../../../../core/services/configuration.service';
import { CoberturasService } from '../../../coberturas/coberturas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment, AppointmentCreateDTO, Patient, Profesional } from '../../../../core/models';
import { createAuthServiceMock } from '../../../../../testing/auth-service.mock';

function makeMocks() {
  return {
    appointmentsService: {
      getFilteredAppointments: vi.fn(() => of([] as Appointment[])),
      loadError$: new Subject<unknown>(),
      setFilter: vi.fn(),
      setFilterPendingOnly: vi.fn(),
      setFilterPendientesOnly: vi.fn(),
      setFilterCanceladosOnly: vi.fn(),
      loadAppointmentsForMonth: vi.fn(),
      create: vi.fn(() => of({ id: 'apt1' } as Appointment)),
      delete: vi.fn(() => of(undefined)),
      checkAvailability: vi.fn(() => of(true))
    },
    patientService: {
      getPatients: vi.fn(() => of([] as Patient[])),
      create: vi.fn((p: Partial<Patient>, _skipGlobal?: boolean) => of({ ...p, id: 'p-new' } as Patient))
    },
    profesionalService: { getProfesionales: vi.fn(() => of([] as Profesional[])) },
    errorHandler: {
      getErrorMessage: vi.fn((_err: unknown, ctx: string) => `Error al ${ctx}`),
      isNetworkError: vi.fn(() => false)
    },
    notification: { showWarning: vi.fn(), showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() },
    moduleRulesService: { getClinicalModules: vi.fn(() => of([])) },
    configurationService: {
      formatAppointmentDate: vi.fn(() => '10/08/2026'),
      buildWhatsAppLink: vi.fn(() => 'https://wa.me/123')
    },
    coberturasService: { listar: vi.fn(() => of([])) },
    authService: createAuthServiceMock({
      getCurrentUser: vi.fn(() => ({ organizationPais: 'AR' })),
      hasCapability: vi.fn(() => true),
      currentUser$: of({ organizationPais: 'AR' })
    }),
    router: { navigate: vi.fn() }
  };
}

async function renderView(mocks: ReturnType<typeof makeMocks>) {
  return render(TurnosViewComponent, {
    providers: [
      { provide: AppointmentsService, useValue: mocks.appointmentsService },
      { provide: PatientService, useValue: mocks.patientService },
      { provide: ProfesionalService, useValue: mocks.profesionalService },
      { provide: ErrorHandlerService, useValue: mocks.errorHandler },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: ModuleRulesService, useValue: mocks.moduleRulesService },
      { provide: ConfigurationService, useValue: mocks.configurationService },
      { provide: CoberturasService, useValue: mocks.coberturasService },
      { provide: AuthService, useValue: mocks.authService },
      { provide: Router, useValue: mocks.router }
    ]
  });
}

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-10', estado: 'PENDIENTE', ...overrides } as Appointment;
}

describe('TurnosViewComponent', () => {
  describe('ngOnInit: carga inicial', () => {
    it('carga turnos/pacientes/profesionales y selecciona la fecha de hoy si no había ninguna', async () => {
      const mocks = makeMocks();
      const appointments = [appt()];
      const patients: Patient[] = [{ id: 'p1', nombre: 'Ana', apellido: 'García' } as Patient];
      const profesionales: Profesional[] = [{ id: 'pr1', nombre: 'Bruno', apellido: 'Díaz' } as Profesional];
      mocks.appointmentsService.getFilteredAppointments.mockReturnValue(of(appointments));
      mocks.patientService.getPatients.mockReturnValue(of(patients));
      mocks.profesionalService.getProfesionales.mockReturnValue(of(profesionales));

      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.appointments).toEqual(appointments);
      expect(fixture.componentInstance.patients).toEqual(patients);
      expect(fixture.componentInstance.profesionales).toEqual(profesionales);
      expect(fixture.componentInstance.selectedDate).not.toBeNull();
      expect(mocks.appointmentsService.loadAppointmentsForMonth).toHaveBeenCalled();
    });

    it('error 404 al cargar turnos: no arma mensaje ni dispara toast (pero hasError igual queda en true)', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.getFilteredAppointments.mockReturnValue(throwError(() => ({ status: 404 })));
      const { fixture } = await renderView(mocks);

      // `hasError = true` se setea incondicionalmente al final del handler de error,
      // incluso en la rama 404 que "no hace nada" — solo errorMessage y el toast quedan gateados.
      expect(fixture.componentInstance.hasError).toBe(true);
      expect(fixture.componentInstance.errorMessage).toBeNull();
      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });

    it('error de red al cargar turnos: solo alert en la vista, sin toast', async () => {
      const mocks = makeMocks();
      mocks.errorHandler.isNetworkError.mockReturnValue(true);
      mocks.appointmentsService.getFilteredAppointments.mockReturnValue(throwError(() => ({ status: 0 })));
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.hasError).toBe(true);
      expect(fixture.componentInstance.errorMessage).toBe('Error al cargar los turnos');
      expect(mocks.notification.showError).not.toHaveBeenCalled();
    });

    it('otro error (no 404, no red): hasError=true y dispara el toast', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.getFilteredAppointments.mockReturnValue(throwError(() => ({ status: 500 })));
      const { fixture } = await renderView(mocks);

      expect(fixture.componentInstance.hasError).toBe(true);
      expect(mocks.notification.showError).toHaveBeenCalledWith('Error al cargar los turnos');
    });

    it('loadError$ (de loadAppointmentsForMonth) también propaga a hasError/errorMessage', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      mocks.appointmentsService.loadError$.next({ status: 500 });

      expect(fixture.componentInstance.hasError).toBe(true);
      expect(fixture.componentInstance.errorMessage).toBe('Error al cargar los turnos');
      expect(fixture.componentInstance.isLoadingAppointments).toBe(false);
    });
  });

  describe('filtros', () => {
    it('onDateClick actualiza selectedDate', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.onDateClick('2026-08-20');
      expect(fixture.componentInstance.selectedDate).toBe('2026-08-20');
    });

    it('onMonthChange actualiza currentDate y recarga el mes', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      mocks.appointmentsService.loadAppointmentsForMonth.mockClear();

      fixture.componentInstance.onMonthChange(new Date(2026, 8, 1));

      expect(fixture.componentInstance.currentDate).toEqual(new Date(2026, 8, 1));
      expect(mocks.appointmentsService.loadAppointmentsForMonth).toHaveBeenCalledWith(2026, 8);
    });

    it('onFilterChange con término vacío manda type "none" al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onFilterChange({ type: 'patient', term: '' });
      expect(mocks.appointmentsService.setFilter).toHaveBeenCalledWith('none', '');

      fixture.componentInstance.onFilterChange({ type: 'patient', term: 'ana' });
      expect(mocks.appointmentsService.setFilter).toHaveBeenCalledWith('patient', 'ana');
    });

    it('los 3 checkboxes rápidos delegan en el servicio correspondiente', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);

      fixture.componentInstance.onPendingOnlyChange(true);
      fixture.componentInstance.onPendientesOnlyChange(true);
      fixture.componentInstance.onCanceladosOnlyChange(true);

      expect(mocks.appointmentsService.setFilterPendingOnly).toHaveBeenCalledWith(true);
      expect(mocks.appointmentsService.setFilterPendientesOnly).toHaveBeenCalledWith(true);
      expect(mocks.appointmentsService.setFilterCanceladosOnly).toHaveBeenCalledWith(true);
    });
  });

  describe('onAddAppointmentClick / onDialogOpenChange', () => {
    it('sin fecha seleccionada, avisa y no abre el diálogo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = null;

      fixture.componentInstance.onAddAppointmentClick();

      expect(mocks.notification.showWarning).toHaveBeenCalled();
      expect(fixture.componentInstance.isDialogOpen).toBe(false);
    });

    it('con fecha seleccionada, abre el diálogo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = '2026-08-10';

      fixture.componentInstance.onAddAppointmentClick();

      expect(fixture.componentInstance.isDialogOpen).toBe(true);
    });

    it('cerrar el diálogo resetea isLoading', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.isLoading = true;

      fixture.componentInstance.onDialogOpenChange(false);

      expect(fixture.componentInstance.isDialogOpen).toBe(false);
      expect(fixture.componentInstance.isLoading).toBe(false);
    });
  });

  describe('onCreateAppointment', () => {
    const patientData: Partial<Patient> = { nombre: 'Ana', apellido: 'García' };
    const appointmentData: AppointmentCreateDTO = { patientId: '', fecha: '', moduloClinicoId: 'mod1' } as AppointmentCreateDTO;

    it('sin selectedDate, avisa y cierra el diálogo sin llamar a ningún servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = null;

      fixture.componentInstance.onCreateAppointment({ patientData, appointmentData });

      expect(mocks.notification.showWarning).toHaveBeenCalled();
      expect(fixture.componentInstance.isDialogOpen).toBe(false);
      expect(mocks.patientService.create).not.toHaveBeenCalled();
    });

    it('doble submit: si ya está isLoading, no hace nada', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = '2026-08-10';
      fixture.componentInstance.isLoading = true;

      fixture.componentInstance.onCreateAppointment({ patientData, appointmentData });

      expect(mocks.patientService.create).not.toHaveBeenCalled();
    });

    it('profesional no asignable en la fecha: error y no crea nada', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = '2026-08-10';
      fixture.componentInstance.profesionales = [{ id: 'pr1', activo: false } as Profesional];

      fixture.componentInstance.onCreateAppointment({
        patientData,
        appointmentData: { ...appointmentData, profesionalId: 'pr1' }
      });

      expect(mocks.notification.showError).toHaveBeenCalledWith(
        'El profesional seleccionado no puede ser asignado en esta fecha. Por favor, seleccione otro profesional.'
      );
      expect(fixture.componentInstance.isLoading).toBe(false);
      expect(mocks.patientService.create).not.toHaveBeenCalled();
    });

    it('paciente existente (con id): crea el turno directamente, sin pasar por patientService.create', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = '2026-08-10';

      fixture.componentInstance.onCreateAppointment({
        patientData: { id: 'p1', ...patientData },
        appointmentData
      });

      expect(mocks.patientService.create).not.toHaveBeenCalled();
      expect(mocks.appointmentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'p1', fecha: '2026-08-10' }),
        true
      );
      expect(fixture.componentInstance.isDialogOpen).toBe(false);
      expect(mocks.notification.showSuccess).toHaveBeenCalled();
      expect(fixture.componentInstance.isLoading).toBe(false);
    });

    it('paciente nuevo (sin id): primero lo crea y encadena la creación del turno con el id resultante', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = '2026-08-10';

      fixture.componentInstance.onCreateAppointment({ patientData, appointmentData });

      expect(mocks.patientService.create).toHaveBeenCalledWith(patientData, true);
      expect(mocks.appointmentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'p-new', fecha: '2026-08-10' }),
        true
      );
    });

    it('si crear el paciente falla, isLoading vuelve a false y no se intenta crear el turno', async () => {
      const mocks = makeMocks();
      mocks.patientService.create.mockReturnValue(throwError(() => ({ status: 500 })));
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = '2026-08-10';

      fixture.componentInstance.onCreateAppointment({ patientData, appointmentData });

      expect(mocks.appointmentsService.create).not.toHaveBeenCalled();
      expect(fixture.componentInstance.isLoading).toBe(false);
    });

    it('si crear el turno falla, isLoading vuelve a false y el diálogo NO se cierra (para corregir)', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.create.mockReturnValue(throwError(() => ({ status: 500 })));
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = '2026-08-10';
      fixture.componentInstance.isDialogOpen = true;

      fixture.componentInstance.onCreateAppointment({
        patientData: { id: 'p1', ...patientData },
        appointmentData
      });

      expect(fixture.componentInstance.isLoading).toBe(false);
      expect(fixture.componentInstance.isDialogOpen).toBe(true);
    });
  });

  describe('deleteCandidateSummary', () => {
    it('con todos los datos, arma "Paciente - Profesional (hora)"', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.appointments = [
        appt({ id: 'a1', patientNombre: 'Ana', patientApellido: 'García', profesionalNombre: 'Bruno', profesionalApellido: 'Díaz', hora: '10:30:00' })
      ];

      fixture.componentInstance.openDeleteConfirm('a1');

      expect(fixture.componentInstance.deleteCandidateSummary).toBe('Ana García - Bruno Díaz (10:30)');
      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(true);
    });

    it('sin profesional asignado y sin hora, arma el resumen solo con el paciente', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.appointments = [appt({ id: 'a1', patientNombre: 'Ana', patientApellido: 'García' })];

      fixture.componentInstance.openDeleteConfirm('a1');

      expect(fixture.componentInstance.deleteCandidateSummary).toBe('Ana García');
    });

    it('si no encuentra el turno, usa "Paciente" como fallback', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.appointments = [];

      fixture.componentInstance.openDeleteConfirm('no-existe');

      expect(fixture.componentInstance.deleteCandidateSummary).toBe('Paciente');
    });

    it('mientras se está eliminando, openDeleteConfirm/closeDeleteConfirm son no-op', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.isDeletingAppointment = true;
      fixture.componentInstance.isDeleteConfirmOpen = true;
      fixture.componentInstance.deleteCandidateId = 'a1';

      fixture.componentInstance.closeDeleteConfirm();

      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(true);
    });
  });

  describe('confirmDeleteAppointment', () => {
    it('éxito: cierra el modal, limpia candidato y muestra el toast', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.deleteCandidateId = 'a1';
      fixture.componentInstance.isDeleteConfirmOpen = true;

      fixture.componentInstance.confirmDeleteAppointment();

      expect(mocks.appointmentsService.delete).toHaveBeenCalledWith('a1', true);
      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(false);
      expect(fixture.componentInstance.deleteCandidateId).toBeNull();
      expect(mocks.notification.showSuccess).toHaveBeenCalled();
    });

    it('error: mantiene el modal abierto para reintentar', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.delete.mockReturnValue(throwError(() => ({ status: 500 })));
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.deleteCandidateId = 'a1';
      fixture.componentInstance.isDeleteConfirmOpen = true;

      fixture.componentInstance.confirmDeleteAppointment();

      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(true);
      expect(fixture.componentInstance.deleteCandidateId).toBe('a1');
    });

    it('sin candidato (id null), simplemente cierra el modal', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.deleteCandidateId = null;
      fixture.componentInstance.isDeleteConfirmOpen = true;

      fixture.componentInstance.confirmDeleteAppointment();

      expect(mocks.appointmentsService.delete).not.toHaveBeenCalled();
      expect(fixture.componentInstance.isDeleteConfirmOpen).toBe(false);
    });
  });

  describe('getters', () => {
    it('activeProfesionales excluye a los inactivos', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.profesionales = [
        { id: 'p1', activo: true } as Profesional,
        { id: 'p2', activo: false } as Profesional
      ];

      expect(fixture.componentInstance.activeProfesionales.map(p => p.id)).toEqual(['p1']);
    });

    it('assignableProfesionales es vacío sin selectedDate', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.selectedDate = null;

      expect(fixture.componentInstance.assignableProfesionales).toEqual([]);
    });

    it('getAppointmentsForDate filtra por fecha exacta', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderView(mocks);
      fixture.componentInstance.appointments = [appt({ id: 'a1', fecha: '2026-08-10' }), appt({ id: 'a2', fecha: '2026-08-11' })];

      expect(fixture.componentInstance.getAppointmentsForDate('2026-08-10').map(a => a.id)).toEqual(['a1']);
    });
  });
});
