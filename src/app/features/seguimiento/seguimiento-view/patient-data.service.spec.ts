import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PatientDataService } from './patient-data.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { Patient, Appointment, PatientSeguimientoResumen } from '../../../core/models';

function patient(overrides: Partial<Patient> = {}): Patient {
  return { id: 'p-1', nombre: 'Ana', apellido: 'García', identificacion: '30111222', ...overrides } as Patient;
}

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a-1', fecha: '2026-05-01', estado: 'PENDIENTE', patientIdentificacion: '30111222', ...overrides } as Appointment;
}

function resumen(overrides: Partial<PatientSeguimientoResumen> = {}): PatientSeguimientoResumen {
  return { patientIdentificacion: '30111222', totalAdeudado: 0, totalTurnos: 0, availableYears: [2026], ...overrides } as PatientSeguimientoResumen;
}

describe('PatientDataService', () => {
  let service: PatientDataService;
  let appointmentsService: { findByDateRange: ReturnType<typeof vi.fn>; getSeguimientoResumen: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    appointmentsService = {
      findByDateRange: vi.fn(() => of([])),
      getSeguimientoResumen: vi.fn(() => of([]))
    };
    TestBed.configureTestingModule({
      providers: [PatientDataService, { provide: AppointmentsService, useValue: appointmentsService }]
    });
    service = TestBed.inject(PatientDataService);
  });

  describe('setPatients()', () => {
    it('indexa por identificacion; un paciente sin identificacion queda fuera del mapa', () => {
      service.setPatients([patient(), { ...patient(), id: 'p-2', identificacion: undefined as unknown as string }]);
      expect(service.patientsMap.size).toBe(1);
      expect(service.patientsMap.get('30111222')).toBeDefined();
    });
  });

  describe('contrato anti-NG0103 (DEUDA § 4.3): getAvailableMonths()/getFilteredAppointments() no deben devolver un array nuevo si nada cambió', () => {
    it('sin meses cacheados, devuelve siempre la misma referencia (EMPTY_MONTHS), no un [] nuevo', () => {
      const first = service.getAvailableMonths('30111222');
      const second = service.getAvailableMonths('sin-cache');
      expect(first).toBe(second);
      expect(first).toEqual([]);
    });

    it('dos llamadas seguidas a getFilteredAppointments sin cambios de estado devuelven la MISMA referencia', () => {
      service.setPatients([patient()]);
      service.setResumen([resumen()]);
      service.updatePatientGroups();

      const group = service.patientGroups[0];
      const first = service.getFilteredAppointments(group);
      const second = service.getFilteredAppointments(group);
      expect(first).toBe(second);
    });
  });

  describe('loadYear()', () => {
    it('cachea por año: la segunda llamada con el mismo año no vuelve a pegarle al servicio', () => {
      service.loadYear('2026').subscribe();
      service.loadYear('2026').subscribe();
      expect(appointmentsService.findByDateRange).toHaveBeenCalledTimes(1);
    });

    it('años distintos sí disparan requests distintas', () => {
      service.loadYear('2026').subscribe();
      service.loadYear('2025').subscribe();
      expect(appointmentsService.findByDateRange).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureAllYearsLoaded()', () => {
    it('si todos los años ya están cacheados, no llama a ningún HTTP', () => {
      service.setResumen([resumen({ availableYears: [2026] })]);
      service.loadYear('2026').subscribe();
      appointmentsService.findByDateRange.mockClear();

      service.ensureAllYearsLoaded('30111222').subscribe();
      expect(appointmentsService.findByDateRange).not.toHaveBeenCalled();
    });

    it('carga solo los años pendientes, no los ya cacheados', () => {
      service.setResumen([resumen({ availableYears: [2025, 2026] })]);
      service.loadYear('2026').subscribe();
      appointmentsService.findByDateRange.mockClear();

      service.ensureAllYearsLoaded('30111222').subscribe();
      expect(appointmentsService.findByDateRange).toHaveBeenCalledTimes(1);
      expect(appointmentsService.findByDateRange).toHaveBeenCalledWith('2025-01-01', '2025-12-31');
    });
  });

  describe('updatePatientGroups() — filtro por búsqueda', () => {
    beforeEach(() => {
      service.setPatients([
        patient({ id: 'p-1', nombre: 'Ana', apellido: 'García', identificacion: '111', email: undefined }),
        patient({ id: 'p-2', nombre: 'Bruno', apellido: 'Pérez', identificacion: '222', email: 'bruno@x.com' })
      ]);
    });

    it('sin término de búsqueda: incluye todos los pacientes', () => {
      service.updatePatientGroups();
      expect(service.patientGroups).toHaveLength(2);
    });

    it('filtra por nombre completo (case-insensitive)', () => {
      service.searchTerm = 'ana garcía';
      service.updatePatientGroups();
      expect(service.patientGroups.map(g => g.patient.identificacion)).toEqual(['111']);
    });

    it('filtra por identificación', () => {
      service.searchTerm = '222';
      service.updatePatientGroups();
      expect(service.patientGroups.map(g => g.patient.identificacion)).toEqual(['222']);
    });

    it('filtra por email', () => {
      service.searchTerm = 'bruno@x.com';
      service.updatePatientGroups();
      expect(service.patientGroups.map(g => g.patient.identificacion)).toEqual(['222']);
    });
  });

  describe('onYearFilterChange()', () => {
    it('resetea el filtro de mes a "all" como efecto secundario del cambio de año', () => {
      service.setResumen([resumen()]);
      service.onMonthFilterChange('30111222', '03');
      expect(service.getSelectedMonth('30111222')).toBe('03');

      service.onYearFilterChange('30111222', '2026').subscribe();
      expect(service.getSelectedMonth('30111222')).toBe('all');
    });
  });

  describe('updateCachedAppointment()', () => {
    beforeEach(() => {
      service.setPatients([patient()]);
      service.setResumen([resumen()]);
    });

    it('actualiza el turno si su año ya está cargado', () => {
      const original = appointment({ id: 'a-1', fecha: '2026-05-01', estado: 'PENDIENTE' });
      appointmentsService.findByDateRange.mockReturnValue(of([original]));
      service.loadYear('2026').subscribe();

      service.updateCachedAppointment({ ...original, estado: 'COMPLETADO' });
      service.updatePatientGroups();

      const group = service.patientGroups[0];
      const appointments = service.getFilteredAppointments(group);
      expect(appointments[0].estado).toBe('COMPLETADO');
    });

    it('no-op silencioso si el año del turno actualizado nunca se cargó', () => {
      expect(() => service.updateCachedAppointment(appointment({ fecha: '2099-01-01' }))).not.toThrow();
    });
  });
});
