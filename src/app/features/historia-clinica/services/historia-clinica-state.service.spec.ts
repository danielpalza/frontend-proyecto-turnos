import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HistoriaClinicaStateService } from './historia-clinica-state.service';
import { HistoriaClinicaService } from '../../../core/services/historia-clinica.service';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { ClinicalAttentionService } from '../../../core/services/clinical-attention.service';
import { Appointment } from '../../../core/models/appointment.model';
import { HistoriaClinicaResponse } from '../../../core/models/historia-clinica.model';

function historiaResponse(overrides: Partial<HistoriaClinicaResponse> = {}): HistoriaClinicaResponse {
  return { appointmentId: 'apt-1', patientId: 'p-1', estado: 'BORRADOR', editable: true, ...overrides };
}

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'apt-1', fecha: '2026-08-07', estado: 'PENDIENTE', patientId: 'p-1', ...overrides } as Appointment;
}

const notFound = () => throwError(() => new HttpErrorResponse({ status: 404 }));

describe('HistoriaClinicaStateService', () => {
  let service: HistoriaClinicaStateService;
  let historiaClinicaService: { getByAppointment: ReturnType<typeof vi.fn>; saveDraft: ReturnType<typeof vi.fn>; sign: ReturnType<typeof vi.fn> };
  let appointmentsService: { findById: ReturnType<typeof vi.fn>; updateStatus: ReturnType<typeof vi.fn> };
  let clinicalAttention: { record: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    historiaClinicaService = {
      getByAppointment: vi.fn(() => of(historiaResponse())),
      saveDraft: vi.fn(),
      sign: vi.fn()
    };
    appointmentsService = {
      findById: vi.fn(() => of(appointment())),
      updateStatus: vi.fn(() => of(appointment({ estado: 'EN_CURSO' })))
    };
    clinicalAttention = { record: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: HistoriaClinicaService, useValue: historiaClinicaService },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: ClinicalAttentionService, useValue: clinicalAttention }
      ]
    });

    service = TestBed.inject(HistoriaClinicaStateService);
  });

  describe('loadForAppointment()', () => {
    it('carga la respuesta, registra la atención y marca isEditable según el flag', () => {
      service.loadForAppointment('apt-1').subscribe();

      expect(service.formValue).toEqual(historiaResponse());
      expect(service.isEditable).toBe(true);
      expect(clinicalAttention.record).toHaveBeenCalledWith('apt-1', 'historia-clinica');
    });

    it('un 404 en historia clínica se sustituye por un formulario vacío en BORRADOR', () => {
      historiaClinicaService.getByAppointment.mockReturnValue(notFound());
      service.loadForAppointment('apt-1').subscribe();

      expect(service.formValue).toMatchObject({ appointmentId: 'apt-1', estado: 'BORRADOR', editable: true });
    });

    it('marca el turno EN_CURSO si es editable y está PENDIENTE/CONFIRMADO', () => {
      appointmentsService.findById.mockReturnValue(of(appointment({ estado: 'CONFIRMADO' })));
      service.loadForAppointment('apt-1').subscribe();

      expect(appointmentsService.updateStatus).toHaveBeenCalledWith('apt-1', 'EN_CURSO');
    });

    it('no marca EN_CURSO si la historia clínica no es editable (turno cerrado)', () => {
      historiaClinicaService.getByAppointment.mockReturnValue(of(historiaResponse({ editable: false })));
      service.loadForAppointment('apt-1').subscribe();

      expect(service.isEditable).toBe(false);
      expect(appointmentsService.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('saveDraft() / sign()', () => {
    it('saveDraft sin turno cargado lanza síncronamente', () => {
      expect(() => service.saveDraft({})).toThrow('No hay turno cargado');
    });

    it('sign sin turno cargado lanza síncronamente', () => {
      expect(() => service.sign({})).toThrow('No hay turno cargado');
    });

    it('saveDraft con turno cargado actualiza el form con la respuesta', () => {
      service.loadForAppointment('apt-1').subscribe();
      historiaClinicaService.saveDraft.mockReturnValue(of(historiaResponse({ diagnostico: 'x' })));

      service.saveDraft({ diagnostico: 'x' }).subscribe();

      expect(historiaClinicaService.saveDraft).toHaveBeenCalledWith('apt-1', { diagnostico: 'x' });
      expect(service.formValue?.diagnostico).toBe('x');
    });

    it('sign() puede cerrar el formulario: si la respuesta trae editable:false, isEditable pasa a false', () => {
      service.loadForAppointment('apt-1').subscribe();
      expect(service.isEditable).toBe(true);

      historiaClinicaService.sign.mockReturnValue(of(historiaResponse({ estado: 'FIRMADO', editable: false })));
      service.sign({}).subscribe();

      expect(service.isEditable).toBe(false);
    });
  });
});
