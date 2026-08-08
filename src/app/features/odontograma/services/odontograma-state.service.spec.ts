import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OdontogramaStateService } from './odontograma-state.service';
import { OdontogramaService } from '../../../core/services/odontograma.service';
import { PeriodontogramaService } from '../../../core/services/periodontograma.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientService } from '../../../core/services/patient.service';
import { OdontoStateService } from './odonto-state.service';
import { PerioStateService } from './perio-state.service';
import { ClinicalAttentionService } from '../../../core/services/clinical-attention.service';
import { EMPTY_ANAMNESIS } from '../../../core/utils/anamnesis.util';
import { Appointment } from '../../../core/models/appointment.model';
import { OdontogramaResponse } from '../../../core/models/odontograma.model';
import { PeriodontogramaResponse } from '../../../core/models/periodontograma.model';

function odontoResponse(overrides: Partial<OdontogramaResponse> = {}): OdontogramaResponse {
  return {
    appointmentId: 'apt-1',
    patientId: 'p-1',
    estadoActual: { caras: [], leyendas: [] },
    cambiosTurno: { caras: [], leyendas: [] },
    ...overrides
  };
}

function perioResponse(overrides: Partial<PeriodontogramaResponse> = {}): PeriodontogramaResponse {
  return {
    appointmentId: 'apt-1',
    patientId: 'p-1',
    estadoActual: { dientes: [] },
    cambiosTurno: { dientes: [] },
    ...overrides
  };
}

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-1',
    fecha: '2026-08-07',
    estado: 'PENDIENTE',
    patientId: 'p-1',
    ...overrides
  } as Appointment;
}

const notFound = () => throwError(() => new HttpErrorResponse({ status: 404 }));

describe('OdontogramaStateService', () => {
  let service: OdontogramaStateService;
  let odontogramaService: { getByAppointment: ReturnType<typeof vi.fn>; saveTurnoCompleto: ReturnType<typeof vi.fn> };
  let periodontogramaService: { getByAppointment: ReturnType<typeof vi.fn> };
  let appointmentsService: { findById: ReturnType<typeof vi.fn>; updateStatus: ReturnType<typeof vi.fn> };
  let patientService: { findById: ReturnType<typeof vi.fn> };
  let odontoState: Record<string, ReturnType<typeof vi.fn> | unknown>;
  let perioState: Record<string, ReturnType<typeof vi.fn> | unknown>;
  let clinicalAttention: { record: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    odontogramaService = { getByAppointment: vi.fn(() => of(odontoResponse())), saveTurnoCompleto: vi.fn() };
    periodontogramaService = { getByAppointment: vi.fn(() => of(perioResponse())) };
    appointmentsService = { findById: vi.fn(() => of(appointment())), updateStatus: vi.fn(() => of(appointment({ estado: 'EN_CURSO' }))) };
    patientService = { findById: vi.fn(() => of({ id: 'p-1', anamnesis: null })) };
    odontoState = {
      loadOdonto: vi.fn(),
      applySaveResponse: vi.fn(),
      buildOdontogramDelta: vi.fn(() => ({})),
      setHistoriaClinica: vi.fn(),
      selectTooth: vi.fn(),
      getFaceState: vi.fn(),
      cycleFace: vi.fn(),
      toggleItemForSelectedTooth: vi.fn(),
      isItemSelectedForCurrentTooth: vi.fn(),
      getIconsForTooth: vi.fn(),
      removeItemsByLabelsForSelectedTooth: vi.fn(),
      setComentario: vi.fn(),
      setPlanTratamiento: vi.fn(),
      selectedTooth$: of(null),
      faces$: of(new Map()),
      toothIcons$: of({}),
      comentario$: of(''),
      planTratamiento$: of(''),
      comentarioAnterior$: of(''),
      historiaClinica$: of(EMPTY_ANAMNESIS)
    };
    perioState = {
      loadPerio: vi.fn(),
      applySaveResponse: vi.fn(),
      buildPeriodontogramDelta: vi.fn(() => ({ dientes: [] })),
      perioTeeth$: of(new Map()),
      getPerioTeethMap: vi.fn(() => new Map()),
      notifyPerioChange: vi.fn(),
      updatePerioTooth: vi.fn()
    };
    clinicalAttention = { record: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: OdontogramaService, useValue: odontogramaService },
        { provide: PeriodontogramaService, useValue: periodontogramaService },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: PatientService, useValue: patientService },
        { provide: OdontoStateService, useValue: odontoState },
        { provide: PerioStateService, useValue: perioState },
        { provide: ClinicalAttentionService, useValue: clinicalAttention }
      ]
    });

    service = TestBed.inject(OdontogramaStateService);
  });

  describe('loadForAppointment()', () => {
    it('en éxito, delega la carga a odontoState.loadOdonto y perioState.loadPerio', () => {
      service.loadForAppointment('apt-1').subscribe();

      expect(odontoState['loadOdonto']).toHaveBeenCalled();
      expect(perioState['loadPerio']).toHaveBeenCalled();
      expect(clinicalAttention.record).toHaveBeenCalledWith('apt-1', 'odontograma');
    });

    it('un 404 en odontograma se sustituye por una respuesta vacía, sin romper el load', () => {
      odontogramaService.getByAppointment.mockReturnValue(notFound());
      let succeeded = false;
      service.loadForAppointment('apt-1').subscribe({
        next: () => (succeeded = true),
        error: () => undefined
      });
      expect(succeeded).toBe(true);
    });

    it('un error que no es 404 en odontograma propaga el error', () => {
      odontogramaService.getByAppointment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      let failed = false;
      service.loadForAppointment('apt-1').subscribe({
        next: () => undefined,
        error: () => (failed = true)
      });
      expect(failed).toBe(true);
    });

    it('editable es el AND de odonto.editable y perio.editable', () => {
      odontogramaService.getByAppointment.mockReturnValue(of(odontoResponse({ editable: true })));
      periodontogramaService.getByAppointment.mockReturnValue(of(perioResponse({ editable: false })));

      service.loadForAppointment('apt-1').subscribe();

      expect(service.isEditable).toBe(false);
    });

    it('marca el turno EN_CURSO si es editable y está PENDIENTE/CONFIRMADO', () => {
      appointmentsService.findById.mockReturnValue(of(appointment({ estado: 'PENDIENTE' })));
      service.loadForAppointment('apt-1').subscribe();

      expect(appointmentsService.updateStatus).toHaveBeenCalledWith('apt-1', 'EN_CURSO');
    });

    it('no marca EN_CURSO si el turno no es editable', () => {
      odontogramaService.getByAppointment.mockReturnValue(of(odontoResponse({ editable: false })));
      service.loadForAppointment('apt-1').subscribe();

      expect(appointmentsService.updateStatus).not.toHaveBeenCalled();
    });

    it('un fallo en el fetch del paciente no rompe el load principal (antecedentes vacíos)', () => {
      patientService.findById.mockReturnValue(throwError(() => new Error('fallo de red')));
      let succeeded = false;
      service.loadForAppointment('apt-1').subscribe({
        next: () => (succeeded = true),
        error: () => undefined
      });

      expect(succeeded).toBe(true);
      expect(odontoState['setHistoriaClinica']).toHaveBeenCalled();
    });

    it('sin patientId en el turno, no llama a patientService.findById', () => {
      appointmentsService.findById.mockReturnValue(of(appointment({ patientId: undefined })));
      service.loadForAppointment('apt-1').subscribe();

      expect(patientService.findById).not.toHaveBeenCalled();
    });
  });

  describe('saveTurnoCompleto()', () => {
    it('lanza síncronamente si no hay turno cargado (no es un error de Observable)', () => {
      expect(() => service.saveTurnoCompleto()).toThrow('No hay turno cargado');
    });

    it('con turno cargado, arma el delta combinado y aplica la respuesta a ambos estados', () => {
      odontogramaService.saveTurnoCompleto.mockReturnValue(
        of({ appointmentId: 'apt-1', patientId: 'p-1', odontograma: odontoResponse(), periodontograma: perioResponse() })
      );

      service.loadForAppointment('apt-1').subscribe();
      service.saveTurnoCompleto().subscribe();

      expect(odontogramaService.saveTurnoCompleto).toHaveBeenCalledWith('apt-1', expect.any(Object));
      expect(odontoState['applySaveResponse']).toHaveBeenCalled();
      expect(perioState['applySaveResponse']).toHaveBeenCalled();
    });
  });

  describe('pass-throughs', () => {
    it('cycleFace delega en odontoState con los mismos argumentos', () => {
      service.cycleFace(11, 'top');
      expect(odontoState['cycleFace']).toHaveBeenCalledWith(11, 'top');
    });

    it('notifyPerioChange delega en perioState', () => {
      service.notifyPerioChange();
      expect(perioState['notifyPerioChange']).toHaveBeenCalled();
    });

    it('selectTooth / getFaceState / toggleItemForSelectedTooth / isItemSelectedForCurrentTooth / getIconsForTooth / removeItemsByLabelsForSelectedTooth delegan en odontoState', () => {
      service.selectTooth(11);
      expect(odontoState['selectTooth']).toHaveBeenCalledWith(11);

      service.getFaceState(11, 'top');
      expect(odontoState['getFaceState']).toHaveBeenCalledWith(11, 'top');

      const item = { label: 'Corona', icono: 'corona' };
      service.toggleItemForSelectedTooth(item, true);
      expect(odontoState['toggleItemForSelectedTooth']).toHaveBeenCalledWith(item, true);

      service.isItemSelectedForCurrentTooth('Corona');
      expect(odontoState['isItemSelectedForCurrentTooth']).toHaveBeenCalledWith('Corona');

      service.getIconsForTooth(11);
      expect(odontoState['getIconsForTooth']).toHaveBeenCalledWith(11);

      service.removeItemsByLabelsForSelectedTooth(['Corona']);
      expect(odontoState['removeItemsByLabelsForSelectedTooth']).toHaveBeenCalledWith(['Corona']);
    });

    it('setComentario / setPlanTratamiento delegan en odontoState', () => {
      service.setComentario('x');
      expect(odontoState['setComentario']).toHaveBeenCalledWith('x');

      service.setPlanTratamiento('y');
      expect(odontoState['setPlanTratamiento']).toHaveBeenCalledWith('y');
    });

    it('getPerioTeethMap / updatePerioTooth delegan en perioState', () => {
      service.getPerioTeethMap();
      expect(perioState['getPerioTeethMap']).toHaveBeenCalled();

      const updater = () => undefined;
      service.updatePerioTooth(11, updater);
      expect(perioState['updatePerioTooth']).toHaveBeenCalledWith(11, updater);
    });

    it('refreshAppointmentPaymentSnapshot sin turno cargado no llama a ningún HTTP', () => {
      let resolved = false;
      service.refreshAppointmentPaymentSnapshot().subscribe(() => (resolved = true));
      expect(resolved).toBe(true);
      expect(appointmentsService.findById).not.toHaveBeenCalled();
    });

    it('refreshAppointmentPaymentSnapshot con turno cargado actualiza el snapshot de pago', () => {
      appointmentsService.findById.mockReturnValue(
        of({ id: 'apt-1', precioBono: 10, precioTratamiento: 20, extras: 0, montoPago: 5, observaciones: '', observacionesTurno: '' })
      );
      service.loadForAppointment('apt-1').subscribe();

      service.refreshAppointmentPaymentSnapshot().subscribe();

      expect(service.appointmentPaymentSnapshot.precioTratamiento).toBe(20);
    });
  });
});
