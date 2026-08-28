import { render } from '@testing-library/angular';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TurnClinicalModalComponent } from './turn-clinical-modal.component';
import { OdontogramaService } from '../../../../core/services/odontograma.service';
import { PeriodontogramaService } from '../../../../core/services/periodontograma.service';
import { ModuleRulesService } from '../../../../core/services/module-rules.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment } from '../../../../core/models';
import { OdontogramaResponse } from '../../../../core/models/odontograma.model';
import { PeriodontogramaDienteDelta, PeriodontogramaResponse } from '../../../../core/models/periodontograma.model';
import { ClinicalModuleRule } from '../../../../core/models/module-rules.model';
import { createAuthServiceMock } from '../../../../../testing/auth-service.mock';

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-10', estado: 'PENDIENTE', ...overrides } as Appointment;
}

function odontograma(overrides: Partial<OdontogramaResponse> = {}): OdontogramaResponse {
  return {
    appointmentId: 'a1', patientId: 'p1',
    estadoActual: { caras: [], leyendas: [] },
    cambiosTurno: { caras: [], leyendas: [] },
    ...overrides
  } as OdontogramaResponse;
}

function periodontograma(overrides: Partial<PeriodontogramaResponse> = {}): PeriodontogramaResponse {
  return {
    appointmentId: 'a1', patientId: 'p1',
    estadoActual: { dientes: [] }, cambiosTurno: { dientes: [] },
    ...overrides
  } as PeriodontogramaResponse;
}

function diente(overrides: Partial<PeriodontogramaDienteDelta> = {}): PeriodontogramaDienteDelta {
  return { numeroDiente: 11, ...overrides };
}

function makeMocks() {
  return {
    odontogramaService: { getByAppointment: vi.fn((_id: string) => of(odontograma())) },
    periodontogramaService: { getByAppointment: vi.fn((_id: string) => of(periodontograma())) },
    moduleRulesService: { getClinicalModules: vi.fn(() => of([] as ClinicalModuleRule[])) },
    authService: createAuthServiceMock({ hasCapability: vi.fn(() => true), currentUser$: of({}) }),
    router: { navigate: vi.fn() }
  };
}

async function renderModal(mocks: ReturnType<typeof makeMocks>, inputs: Record<string, unknown> = {}) {
  return render(TurnClinicalModalComponent, {
    inputs: { open: false, appointment: null, ...inputs },
    providers: [
      { provide: OdontogramaService, useValue: mocks.odontogramaService },
      { provide: PeriodontogramaService, useValue: mocks.periodontogramaService },
      { provide: ModuleRulesService, useValue: mocks.moduleRulesService },
      { provide: AuthService, useValue: mocks.authService },
      { provide: Router, useValue: mocks.router }
    ]
  });
}

describe('TurnClinicalModalComponent', () => {
  describe('la carga se dispara por "open", no por el setter de "appointment"', () => {
    it('setear solo appointment sin open=true no dispara ningún HTTP', async () => {
      const mocks = makeMocks();
      await renderModal(mocks, { appointment: appt(), open: false });

      expect(mocks.odontogramaService.getByAppointment).not.toHaveBeenCalled();
      expect(mocks.periodontogramaService.getByAppointment).not.toHaveBeenCalled();
    });

    it('open=true con appointment cargado dispara ambas requests', async () => {
      const mocks = makeMocks();
      await renderModal(mocks, { appointment: appt({ id: 'a1' }), open: true });

      expect(mocks.odontogramaService.getByAppointment).toHaveBeenCalledWith('a1');
      expect(mocks.periodontogramaService.getByAppointment).toHaveBeenCalledWith('a1');
    });

    it('repetir open=true con el mismo appointment.id no vuelve a pedir nada (loadedAppointmentId)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ id: 'a1' }), open: true });
      mocks.odontogramaService.getByAppointment.mockClear();

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges(false);

      expect(mocks.odontogramaService.getByAppointment).not.toHaveBeenCalled();
    });

    it('abrir con un appointment.id distinto sí vuelve a pedir', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ id: 'a1' }), open: true });
      mocks.odontogramaService.getByAppointment.mockClear();

      fixture.componentRef.setInput('appointment', appt({ id: 'a2' }));
      fixture.detectChanges(false);

      expect(mocks.odontogramaService.getByAppointment).toHaveBeenCalledWith('a2');
    });
  });

  describe('guarded(): 404 es un vacío legítimo, otro error sí marca loadError', () => {
    it('ambos 404: no hay error, solo estado vacío', async () => {
      const mocks = makeMocks();
      mocks.odontogramaService.getByAppointment.mockReturnValue(throwError(() => ({ status: 404 })));
      mocks.periodontogramaService.getByAppointment.mockReturnValue(throwError(() => ({ status: 404 })));
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });

      expect(fixture.componentInstance.loadError).toBe(false);
      expect(fixture.componentInstance.odontograma).toBeNull();
    });

    it('un 404 de un lado y un error real (500) del otro: loadError queda en true', async () => {
      const mocks = makeMocks();
      mocks.odontogramaService.getByAppointment.mockReturnValue(throwError(() => ({ status: 404 })));
      mocks.periodontogramaService.getByAppointment.mockReturnValue(throwError(() => ({ status: 500 })));
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });

      expect(fixture.componentInstance.loadError).toBe(true);
      expect(fixture.componentInstance.odontograma).toBeNull();
      expect(fixture.componentInstance.periodontograma).toBeNull();
    });
  });

  it('contraste con UT-056: tras la carga async, el estado queda consistente (isLoading en false, datos poblados) — este archivo sí pide el refresco con cdr.markForCheck()', async () => {
    const mocks = makeMocks();
    mocks.odontogramaService.getByAppointment.mockReturnValue(of(odontograma({ comentario: 'Todo bien' })));
    const { fixture } = await renderModal(mocks, { appointment: appt(), open: false });

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges(false);

    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(fixture.componentInstance.odontograma?.comentario).toBe('Todo bien');
  });

  describe('close', () => {
    it('limpia todo el estado y emite closed', async () => {
      const closed = vi.fn();
      const mocks = makeMocks();
      const { fixture } = await render(TurnClinicalModalComponent, {
        inputs: { open: true, appointment: appt() },
        on: { closed },
        providers: [
          { provide: OdontogramaService, useValue: mocks.odontogramaService },
          { provide: PeriodontogramaService, useValue: mocks.periodontogramaService },
          { provide: ModuleRulesService, useValue: mocks.moduleRulesService },
          { provide: AuthService, useValue: mocks.authService },
          { provide: Router, useValue: mocks.router }
        ]
      });

      fixture.componentInstance.close();

      expect(fixture.componentInstance.appointment).toBeNull();
      expect(fixture.componentInstance.odontograma).toBeNull();
      expect(closed).toHaveBeenCalled();
    });
  });

  describe('openClinicalModule', () => {
    it('sin módulo clínico resuelto, no navega', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ moduloClinicoCodigo: undefined }), open: true });

      fixture.componentInstance.openClinicalModule();

      expect(mocks.router.navigate).not.toHaveBeenCalled();
    });

    it('con módulo clínico resuelto, cierra el modal y navega a la ruta clínica', async () => {
      const mocks = makeMocks();
      mocks.moduleRulesService.getClinicalModules.mockReturnValue(of([{ codigo: 'ODONTOGRAMA', rutaClinica: 'odontograma' } as ClinicalModuleRule]));
      const closed = vi.fn();
      const { fixture } = await render(TurnClinicalModalComponent, {
        inputs: { open: true, appointment: appt({ id: 'a1', moduloClinicoCodigo: 'ODONTOGRAMA' }) },
        on: { closed },
        providers: [
          { provide: OdontogramaService, useValue: mocks.odontogramaService },
          { provide: PeriodontogramaService, useValue: mocks.periodontogramaService },
          { provide: ModuleRulesService, useValue: mocks.moduleRulesService },
          { provide: AuthService, useValue: mocks.authService },
          { provide: Router, useValue: mocks.router }
        ]
      });

      fixture.componentInstance.openClinicalModule();

      expect(closed).toHaveBeenCalled();
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/odontograma', 'a1']);
    });
  });

  describe('getters de módulo clínico', () => {
    it('clinicalModuleCapability arma "{CODIGO}:VIEW", con fallback sin módulo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ moduloClinicoCodigo: 'ODONTOGRAMA' }) });
      expect(fixture.componentInstance.clinicalModuleCapability).toBe('ODONTOGRAMA:VIEW');

      fixture.componentRef.setInput('appointment', appt({ id: 'a2', moduloClinicoCodigo: undefined }));
      fixture.detectChanges(false);
      expect(fixture.componentInstance.clinicalModuleCapability).toBe('SIN_MODULO_CLINICO:VIEW');
    });

    it('clinicalModuleLabel usa el nombre del módulo si está resuelto, si no un texto genérico', async () => {
      const mocks = makeMocks();
      mocks.moduleRulesService.getClinicalModules.mockReturnValue(of([{ codigo: 'ODONTOGRAMA', nombre: 'Odontograma' } as ClinicalModuleRule]));
      const { fixture } = await renderModal(mocks, { appointment: appt({ moduloClinicoCodigo: 'ODONTOGRAMA' }) });

      expect(fixture.componentInstance.clinicalModuleLabel).toBe('Abrir odontograma completo');
    });

    it('sin módulo asignado, el label es genérico', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ moduloClinicoCodigo: undefined }) });
      expect(fixture.componentInstance.clinicalModuleLabel).toBe('Abrir ficha clínica completa');
    });
  });

  describe('buildToothChanges (vía carga del odontograma)', () => {
    it('agrupa caras y leyendas por diente, ordena por número y filtra dientes sin cambios', async () => {
      const mocks = makeMocks();
      mocks.odontogramaService.getByAppointment.mockReturnValue(of(odontograma({
        cambiosTurno: {
          caras: [
            { numeroDiente: 21, cara: 'arriba', estado: 'caries' },
            { numeroDiente: 11, cara: 'centro', estado: 'obturacion' }
          ],
          leyendas: [
            { numeroDiente: 11, implante: true, corona: false, movilidad: 2 }
          ]
        }
      })));
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });

      const changes = fixture.componentInstance.toothChanges;
      expect(changes.map(c => c.numeroDiente)).toEqual([11, 21]);
      const t11 = changes.find(c => c.numeroDiente === 11)!;
      expect(t11.caras).toEqual([{ cara: 'Centro', estado: 'Obturación', estadoKey: 'obturacion' }]);
      expect(t11.leyendas).toEqual(['Implante']);
      expect(t11.movilidad).toBe(2);
    });

    it('sin cambiosTurno, la lista queda vacía', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });
      expect(fixture.componentInstance.toothChanges).toEqual([]);
    });
  });

  describe('buildPerioSummary', () => {
    it('cuenta un diente como "con sangrado" si CUALQUIERA de los 6 sitios está marcado', async () => {
      const mocks = makeMocks();
      mocks.periodontogramaService.getByAppointment.mockReturnValue(of(periodontograma({
        cambiosTurno: { dientes: [diente({ numeroDiente: 11, lingSangradoD: true })] }
      })));
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });

      expect(fixture.componentInstance.perioSummary).toEqual({
        dientes: 1, sangrado: 1, placa: 0, supuracion: 0, calculo: 0, movilidad: 0, furca: 0
      });
    });

    it('movilidad/furca cuentan por valor truthy (>0), no por presencia del campo', async () => {
      const mocks = makeMocks();
      mocks.periodontogramaService.getByAppointment.mockReturnValue(of(periodontograma({
        cambiosTurno: { dientes: [diente({ numeroDiente: 11, mobility: 2, furcation: 0 })] }
      })));
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });

      expect(fixture.componentInstance.perioSummary?.movilidad).toBe(1);
      expect(fixture.componentInstance.perioSummary?.furca).toBe(0);
    });

    it('sin dientes en el delta, el resumen es null (no un objeto en cero)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });
      expect(fixture.componentInstance.perioSummary).toBeNull();
    });
  });

  describe('isEmpty / hasNotes', () => {
    it('sin notas ni cambios, isEmpty es true', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });
      expect(fixture.componentInstance.isEmpty).toBe(true);
      expect(fixture.componentInstance.hasNotes).toBe(false);
    });

    it('con un comentario del turno, hasNotes es true e isEmpty pasa a false', async () => {
      const mocks = makeMocks();
      mocks.odontogramaService.getByAppointment.mockReturnValue(of(odontograma({ comentario: 'Todo bien' })));
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: true });

      expect(fixture.componentInstance.hasNotes).toBe(true);
      expect(fixture.componentInstance.isEmpty).toBe(false);
    });

    it('mientras está cargando o hay error, isEmpty es false', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt(), open: false });
      fixture.componentInstance.isLoading = true;
      expect(fixture.componentInstance.isEmpty).toBe(false);
    });
  });
});
