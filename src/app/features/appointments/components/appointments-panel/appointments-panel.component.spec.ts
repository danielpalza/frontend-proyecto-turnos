import { render } from '@testing-library/angular';
import { of, throwError, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { AppointmentsPanelComponent } from './appointments-panel.component';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { ConfigurationService } from '../../../../core/services/configuration.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ModuleRulesService } from '../../../../core/services/module-rules.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment, Profesional, Patient } from '../../../../core/models';
import { createAuthServiceMock } from '../../../../../testing/auth-service.mock';

function makeMocks(overrides: { clinicalModules?: unknown[] } = {}) {
  return {
    appointmentsService: {
      addPaymentWithFeedback: vi.fn(() => of({} as Appointment)),
      updateWithFeedback: vi.fn(() => of({} as Appointment))
    },
    whatsappConfig: {
      formatAppointmentDate: vi.fn((f: string) => f),
      buildWhatsAppLink: vi.fn(() => 'https://wa.me/123')
    },
    notification: { showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() },
    router: { navigate: vi.fn() },
    moduleRulesService: { getClinicalModules: vi.fn(() => of(overrides.clinicalModules ?? [])) },
    authService: createAuthServiceMock({ hasCapability: vi.fn(() => true), currentUser$: of({}) })
  };
}

async function renderPanel(mocks: ReturnType<typeof makeMocks>, inputs: Record<string, unknown> = {}) {
  return render(AppointmentsPanelComponent, {
    inputs: { date: '2026-08-10', appointments: [], profesionales: [], patients: [], ...inputs },
    providers: [
      { provide: AppointmentsService, useValue: mocks.appointmentsService },
      { provide: ConfigurationService, useValue: mocks.whatsappConfig },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: Router, useValue: mocks.router },
      { provide: ModuleRulesService, useValue: mocks.moduleRulesService },
      { provide: AuthService, useValue: mocks.authService }
    ]
  });
}

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-10', estado: 'PENDIENTE', ...overrides } as Appointment;
}

describe('AppointmentsPanelComponent', () => {
  describe('filteredAppointments', () => {
    it('sin filtro (todos), ordena por hora ascendente, sin hora al final', async () => {
      const appointments = [
        appt({ id: 'a1', hora: '15:00:00' }),
        appt({ id: 'a2', hora: undefined }),
        appt({ id: 'a3', hora: '09:00:00' })
      ];
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, { appointments });

      expect(fixture.componentInstance.filteredAppointments.map(a => a.id)).toEqual(['a3', 'a1', 'a2']);
    });

    it('filtra por pestaña activa (completado/pendiente/cancelado incluye NO_ASISTIO)', async () => {
      const appointments = [
        appt({ id: 'a1', estado: 'COMPLETADO' }),
        appt({ id: 'a2', estado: 'PENDIENTE' }),
        appt({ id: 'a3', estado: 'CANCELADO' }),
        appt({ id: 'a4', estado: 'NO_ASISTIO' })
      ];
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, { appointments });

      fixture.componentInstance.setActiveTab('cancelado');
      expect(fixture.componentInstance.filteredAppointments.map(a => a.id).sort()).toEqual(['a3', 'a4']);

      fixture.componentInstance.setActiveTab('completado');
      expect(fixture.componentInstance.filteredAppointments.map(a => a.id)).toEqual(['a1']);

      expect(fixture.componentInstance.completadosCount).toBe(1);
      expect(fixture.componentInstance.pendientesCount).toBe(1);
      expect(fixture.componentInstance.canceladosCount).toBe(2);
    });
  });

  describe('ngOnChanges', () => {
    it('reconstruye los índices de pacientes cuando cambia el input patients', async () => {
      const patients: Patient[] = [{ id: 'p1', identificacion: '111', nombre: 'Ana' } as Patient];
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, {
        patients,
        appointments: [appt({ patientId: 'p1' })]
      });

      expect(fixture.componentInstance.hasPatientPhone(appt({ patientId: 'p1' }))).toBe(false);

      fixture.componentRef.setInput('patients', [{ id: 'p1', identificacion: '111', telefono: '1122334455' } as Patient]);
      fixture.detectChanges();

      expect(fixture.componentInstance.hasPatientPhone(appt({ patientId: 'p1' }))).toBe(true);
    });

    it('cambiar la fecha (no en el primer render) colapsa la tarjeta expandida y vuelve a la pestaña "todos"', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.expandedCardId = 'a1';
      fixture.componentInstance.setActiveTab('completado');

      fixture.componentRef.setInput('date', '2026-08-11');
      fixture.detectChanges();

      expect(fixture.componentInstance.expandedCardId).toBeNull();
      expect(fixture.componentInstance.activeTab).toBe('todos');
    });
  });

  describe('avatar y estado visual', () => {
    it('getAvatarColorClass es determinístico: mismo paciente, mismo color siempre', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      const a = appt({ patientId: 'p-siempre-el-mismo' });

      const color1 = fixture.componentInstance.getAvatarColorClass(a);
      const color2 = fixture.componentInstance.getAvatarColorClass(a);

      expect(color1).toBe(color2);
      expect(color1).toMatch(/^avatar-[1-5]$/);
    });

    it('getInitials arma las iniciales en mayúscula, "?" si no hay nada', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      expect(fixture.componentInstance.getInitials('ana', 'garcía')).toBe('AG');
      expect(fixture.componentInstance.getInitials(null, null)).toBe('?');
    });

    it('formatTime recorta a HH:mm y devuelve vacío en formatos inválidos', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      expect(fixture.componentInstance.formatTime('10:30:00')).toBe('10:30');
      expect(fixture.componentInstance.formatTime('1')).toBe('');
      expect(fixture.componentInstance.formatTime(undefined)).toBe('');
    });
  });

  describe('edición de hora (flujo probado a fondo, representa el patrón de los otros 3)', () => {
    it('startEditingHora convierte HH:mm:ss a HH:mm para el input', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.startEditingHora('a1', '10:30:00');

      expect(fixture.componentInstance.isEditingHora('a1')).toBe(true);
      expect(fixture.componentInstance.getHoraInput('a1')).toBe('10:30');
    });

    it('saveHora convierte HH:mm a HH:mm:ss para el backend y limpia el estado de edición al terminar', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingHora('a1', '10:30:00');
      fixture.componentInstance.updateHoraInput('a1', '11:45');

      fixture.componentInstance.saveHora('a1');

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1',
        { hora: '11:45:00' },
        'Hora actualizada correctamente.',
        'actualizar la hora'
      );
      expect(fixture.componentInstance.isEditingHora('a1')).toBe(false);
      expect(fixture.componentInstance.getHoraInput('a1')).toBe('');
    });

    it('saveHora con el input vacío no manda el campo hora (no se soporta limpiar hora)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingHora('a1', '10:30:00');
      fixture.componentInstance.updateHoraInput('a1', '');

      fixture.componentInstance.saveHora('a1');

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1',
        {},
        'Hora actualizada correctamente.',
        'actualizar la hora'
      );
    });

    it('si falla el guardado, revierte al valor original y sale del modo edición', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.updateWithFeedback.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingHora('a1', '10:30:00');
      fixture.componentInstance.updateHoraInput('a1', '11:45');

      fixture.componentInstance.saveHora('a1');

      expect(fixture.componentInstance.getHoraInput('a1')).toBe('10:30');
      expect(fixture.componentInstance.isEditingHora('a1')).toBe(false);
    });

    it('cancelHoraEdit descarta los cambios sin llamar al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingHora('a1', '10:30:00');

      fixture.componentInstance.cancelHoraEdit('a1');

      expect(mocks.appointmentsService.updateWithFeedback).not.toHaveBeenCalled();
      expect(fixture.componentInstance.isEditingHora('a1')).toBe(false);
    });
  });

  describe('otros 3 flujos de edición (mismo patrón, verificación liviana)', () => {
    it('precio: guarda con la clave correcta según el tipo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, { appointments: [appt({ id: 'a1', precioBono: 100 })] });
      fixture.componentInstance.startEditingPrice('a1', 'bono', 100);
      fixture.componentInstance.updatePriceInput('a1', 'bono', 500);

      fixture.componentInstance.savePrice('a1', 'bono');

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1', { precioBono: 500 }, 'Precio (bono) actualizado.', 'actualizar bono'
      );
    });

    it('observaciones de pago: guarda el texto ingresado', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingObservaciones('a1', 'antes');
      fixture.componentInstance.updateObservacionesInput('a1', 'después');

      fixture.componentInstance.saveObservaciones('a1');

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1', { observaciones: 'después' }, 'Observaciones de pago guardadas.', 'actualizar las observaciones'
      );
    });

    it('observaciones del turno: guarda el texto ingresado', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingObservacionesTurno('a1', 'antes');
      fixture.componentInstance.updateObservacionesTurnoInput('a1', 'después');

      fixture.componentInstance.saveObservacionesTurno('a1');

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1', { observacionesTurno: 'después' }, 'Observaciones del turno guardadas.', 'actualizar las observaciones del turno'
      );
    });
  });

  describe('onAddPayment', () => {
    it('con monto 0 o negativo, no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.updatePaymentInput('a1', 0);

      fixture.componentInstance.onAddPayment('a1');

      expect(mocks.appointmentsService.addPaymentWithFeedback).not.toHaveBeenCalled();
    });

    it('evita doble submit mientras hay uno en vuelo', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.addPaymentWithFeedback.mockReturnValue(new Subject<Appointment>());
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.updatePaymentInput('a1', 500);

      fixture.componentInstance.onAddPayment('a1');
      fixture.componentInstance.onAddPayment('a1');

      expect(mocks.appointmentsService.addPaymentWithFeedback).toHaveBeenCalledTimes(1);
    });

    it('éxito: resetea el input de pago a 0', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.updatePaymentInput('a1', 500);

      fixture.componentInstance.onAddPayment('a1');

      expect(fixture.componentInstance.getPaymentInput('a1')).toBe(0);
    });
  });

  describe('reasignación de profesional', () => {
    it('getProfesionalesForReassignSelect incluye al profesional actual aunque ya no sea reasignable', async () => {
      const profesionales: Profesional[] = [
        { id: 'p1', nombre: 'A', apellido: 'B', activo: true } as Profesional,
        { id: 'p2', nombre: 'C', apellido: 'D', activo: false } as Profesional
      ];
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, { profesionales });
      const a = appt({ profesionalId: 'p2' });

      const options = fixture.componentInstance.getProfesionalesForReassignSelect(a);

      expect(options.map(p => p.id)).toContain('p2');
      expect(fixture.componentInstance.isCurrentAssignedProfesional(profesionales[1], a)).toBe(true);
    });

    it('saveProfesional rechaza asignar un profesional no disponible', async () => {
      const profesionales: Profesional[] = [{ id: 'p1', nombre: 'A', apellido: 'B', activo: false } as Profesional];
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, { profesionales });
      fixture.componentInstance.startEditingProfesional('a1', undefined);
      fixture.componentInstance.updateProfesionalSelect('a1', 'p1');

      fixture.componentInstance.saveProfesional('a1');

      expect(mocks.notification.showError).toHaveBeenCalledWith('Solo se pueden asignar profesionales con estado "Disponible".');
      expect(mocks.appointmentsService.updateWithFeedback).not.toHaveBeenCalled();
    });

    it('saveProfesional sin cambios (mismo valor original) cancela la edición sin llamar al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingProfesional('a1', 'p1');

      fixture.componentInstance.saveProfesional('a1');

      expect(mocks.appointmentsService.updateWithFeedback).not.toHaveBeenCalled();
      expect(fixture.componentInstance.isEditingProfesional('a1')).toBe(false);
    });

    it('desasignar (seleccionar vacío) manda unassignProfesional=true', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.startEditingProfesional('a1', 'p1');
      fixture.componentInstance.updateProfesionalSelect('a1', null);

      fixture.componentInstance.saveProfesional('a1');

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1', { unassignProfesional: true }, 'Profesional desasignado correctamente.', 'desasignar el profesional'
      );
    });
  });

  describe('módulo clínico', () => {
    it('openClinicalModule sin módulo asignado muestra un aviso en vez de navegar', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.openClinicalModule(appt({ moduloClinicoCodigo: undefined }));

      expect(mocks.notification.showInfo).toHaveBeenCalled();
      expect(mocks.router.navigate).not.toHaveBeenCalled();
    });

    it('openClinicalModule con módulo asignado navega a la ruta clínica resuelta', async () => {
      const mocks = makeMocks({ clinicalModules: [{ codigo: 'ODONTOGRAMA', rutaClinica: 'odontograma' }] });
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.openClinicalModule(appt({ id: 'a1', moduloClinicoCodigo: 'ODONTOGRAMA' }));

      expect(mocks.router.navigate).toHaveBeenCalledWith(['/odontograma', 'a1']);
    });

    it('getClinicalModuleCapability arma "{CODIGO}:VIEW", con fallback si no hay módulo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.getClinicalModuleCapability(appt({ moduloClinicoCodigo: 'ODONTOGRAMA' }))).toBe('ODONTOGRAMA:VIEW');
      expect(fixture.componentInstance.getClinicalModuleCapability(appt({ moduloClinicoCodigo: undefined }))).toBe('SIN_MODULO_CLINICO:VIEW');
    });
  });

  describe('WhatsApp', () => {
    it('sin teléfono del paciente, no arma link', async () => {
      const patients: Patient[] = [{ id: 'p1', telefono: '' } as Patient];
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, { patients });

      expect(fixture.componentInstance.getWhatsAppLink(appt({ patientId: 'p1' }))).toBeNull();
    });

    it('con teléfono, arma el link usando los datos del turno y del paciente encontrado', async () => {
      const patients: Patient[] = [{ id: 'p1', nombre: 'Ana', apellido: 'García', telefono: '1122334455' } as Patient];
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks, { patients });

      const link = fixture.componentInstance.getWhatsAppLink(
        appt({ patientId: 'p1', hora: '10:30:00', profesionalNombre: 'Bruno', profesionalApellido: 'Díaz' })
      );

      expect(link).toBe('https://wa.me/123');
      expect(mocks.whatsappConfig.buildWhatsAppLink).toHaveBeenCalledWith('1122334455', {
        hora: '10:30',
        fecha: '2026-08-10',
        profesional: 'Bruno Díaz',
        paciente: 'Ana García'
      });
    });
  });
});
