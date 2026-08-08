import { TestBed } from '@angular/core/testing';
import { ClinicalAttentionService } from './clinical-attention.service';

describe('ClinicalAttentionService', () => {
  let service: ClinicalAttentionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClinicalAttentionService);
  });

  it('record() seguido de getLast() devuelve el último turno registrado', () => {
    service.record('turno-1', 'odontograma');
    expect(service.getLast()).toEqual({ appointmentId: 'turno-1', rutaClinica: 'odontograma' });
  });

  it('getLast() sin nada registrado devuelve null', () => {
    expect(service.getLast()).toBeNull();
  });

  it('un valor sobrescribe al anterior: solo se recuerda el último turno atendido', () => {
    service.record('turno-1', 'odontograma');
    service.record('turno-2', 'historia-clinica');
    expect(service.getLast()).toEqual({ appointmentId: 'turno-2', rutaClinica: 'historia-clinica' });
  });

  it('getLast() con JSON corrupto en sessionStorage devuelve null sin lanzar', () => {
    sessionStorage.setItem('ultima_atencion', 'no-es-json');
    expect(() => service.getLast()).not.toThrow();
    expect(service.getLast()).toBeNull();
  });
});
