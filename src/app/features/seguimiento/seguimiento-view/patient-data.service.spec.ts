import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { PatientDataService } from './patient-data.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { Patient, SeguimientoPatientGroup, PageResponse } from '../../../core/models';

function patient(overrides: Partial<Patient> = {}): Patient {
  return { id: 'p-1', nombre: 'Ana', apellido: 'García', identificacion: '30111222', ...overrides } as Patient;
}

function group(overrides: Partial<SeguimientoPatientGroup> = {}): SeguimientoPatientGroup {
  return { patient: patient(), appointments: [], totalAdeudado: 0, totalTurnos: 0, ...overrides };
}

function pageResponse(overrides: Partial<PageResponse<SeguimientoPatientGroup>> = {}): PageResponse<SeguimientoPatientGroup> {
  return { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, ...overrides };
}

describe('PatientDataService', () => {
  let service: PatientDataService;
  let appointmentsService: { getSeguimiento: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    appointmentsService = { getSeguimiento: vi.fn(() => of(pageResponse())) };
    TestBed.configureTestingModule({
      providers: [PatientDataService, { provide: AppointmentsService, useValue: appointmentsService }]
    });
    service = TestBed.inject(PatientDataService);
  });

  describe('loadPage()', () => {
    it('pide la página con desde/hasta/page/size/búsqueda actuales, recortando espacios', () => {
      service.desde = '2026-08-08';
      service.hasta = '2026-09-07';
      service.page = 2;
      service.searchTerm = '  ana  ';

      service.loadPage().subscribe();

      expect(appointmentsService.getSeguimiento).toHaveBeenCalledWith('2026-08-08', '2026-09-07', 2, 20, 'ana');
    });

    it('sin búsqueda, manda undefined en vez de string vacío', () => {
      service.desde = '2026-08-08';
      service.hasta = '2026-09-07';

      service.loadPage().subscribe();

      expect(appointmentsService.getSeguimiento).toHaveBeenCalledWith('2026-08-08', '2026-09-07', 0, 20, undefined);
    });

    it('una búsqueda de solo espacios se trata como vacía', () => {
      service.desde = '2026-08-08';
      service.hasta = '2026-09-07';
      service.searchTerm = '   ';

      service.loadPage().subscribe();

      expect(appointmentsService.getSeguimiento).toHaveBeenCalledWith('2026-08-08', '2026-09-07', 0, 20, undefined);
    });

    it('reemplaza patientGroups y los metadatos de paginación con la respuesta', () => {
      const g1 = group({ patient: patient({ identificacion: '111' }) });
      appointmentsService.getSeguimiento.mockReturnValue(of(pageResponse({
        content: [g1], page: 1, totalElements: 25, totalPages: 2
      })));

      service.loadPage().subscribe();

      expect(service.patientGroups).toEqual([g1]);
      expect(service.totalPages).toBe(2);
      expect(service.totalElements).toBe(25);
    });

    it('reconstruye patientsMap indexado por identificación', () => {
      const g1 = group({ patient: patient({ identificacion: '111' }) });
      const g2 = group({ patient: patient({ id: 'p-2', identificacion: '222' }) });
      appointmentsService.getSeguimiento.mockReturnValue(of(pageResponse({ content: [g1, g2] })));

      service.loadPage().subscribe();

      expect(service.patientsMap.size).toBe(2);
      expect(service.patientsMap.get('111')).toBe(g1.patient);
      expect(service.patientsMap.get('222')).toBe(g2.patient);
    });

    it('un paciente sin identificación queda fuera de patientsMap', () => {
      const g1 = group({ patient: patient({ identificacion: undefined as unknown as string }) });
      appointmentsService.getSeguimiento.mockReturnValue(of(pageResponse({ content: [g1] })));

      service.loadPage().subscribe();

      expect(service.patientsMap.size).toBe(0);
    });

    it('un loadPage nuevo reemplaza patientsMap entero, no acumula pacientes de la página anterior', () => {
      const g1 = group({ patient: patient({ identificacion: '111' }) });
      appointmentsService.getSeguimiento.mockReturnValueOnce(of(pageResponse({ content: [g1] })));
      service.loadPage().subscribe();
      expect(service.patientsMap.has('111')).toBe(true);

      const g2 = group({ patient: patient({ id: 'p-2', identificacion: '222' }) });
      appointmentsService.getSeguimiento.mockReturnValueOnce(of(pageResponse({ content: [g2] })));
      service.loadPage().subscribe();

      expect(service.patientsMap.has('111')).toBe(false);
      expect(service.patientsMap.has('222')).toBe(true);
    });

    it('prende cargando mientras la request está en vuelo, lo apaga al resolver', () => {
      const subject = new Subject<PageResponse<SeguimientoPatientGroup>>();
      appointmentsService.getSeguimiento.mockReturnValue(subject.asObservable());

      service.loadPage().subscribe();
      expect(service.cargando).toBe(true);

      subject.next(pageResponse());
      subject.complete();

      expect(service.cargando).toBe(false);
    });
  });
});
