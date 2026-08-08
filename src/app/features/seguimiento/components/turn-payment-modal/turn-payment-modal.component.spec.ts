import { render } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { TurnPaymentModalComponent } from './turn-payment-modal.component';
import { AppointmentsService } from '../../../../core/services/appointments.service';
import { ConfigurationService } from '../../../../core/services/configuration.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment, Patient } from '../../../../core/models';

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-10', estado: 'PENDIENTE', ...overrides } as Appointment;
}

function makeMocks() {
  return {
    appointmentsService: {
      addPaymentWithFeedback: vi.fn((_id: string, _monto: number) => of(appt())),
      updateWithFeedback: vi.fn((_id: string, _data: unknown, _msg: string, _ctx: string) => of(appt()))
    },
    whatsappConfig: { buildWhatsAppLink: vi.fn(() => 'https://wa.me/123') },
    authService: { hasCapability: vi.fn(() => true), currentUser$: of({}) }
  };
}

async function renderModal(mocks: ReturnType<typeof makeMocks>, inputs: Record<string, unknown> = {}) {
  return render(TurnPaymentModalComponent, {
    inputs: { open: false, appointment: null, patient: undefined, ...inputs },
    providers: [
      { provide: AppointmentsService, useValue: mocks.appointmentsService },
      { provide: ConfigurationService, useValue: mocks.whatsappConfig },
      { provide: AuthService, useValue: mocks.authService }
    ]
  });
}

describe('TurnPaymentModalComponent', () => {
  describe('setter de "appointment": resetea 9 piezas de estado de edición SIEMPRE, sin comparar si es el mismo turno', () => {
    it('reemitir el MISMO turno (mismo id) mientras se edita un precio descarta esa edición en curso, en silencio', async () => {
      const mocks = makeMocks();
      const a = appt({ id: 'a1', precioBono: 100 });
      const { fixture } = await renderModal(mocks, { appointment: a });
      fixture.componentInstance.startEditingPriceBono();
      fixture.componentInstance.inputBono = 999; // el usuario está escribiendo un valor nuevo, sin guardar

      // El padre reemite el mismo turno (p.ej. por un refresh de la lista) sin que el usuario haya tocado "guardar".
      fixture.componentRef.setInput('appointment', appt({ id: 'a1', precioBono: 100 }));
      fixture.detectChanges(false);

      expect(fixture.componentInstance.editingPriceBono).toBe(false);
      expect(fixture.componentInstance.inputBono).toBe(100);
    });

    it('lo mismo aplica a observaciones de pago/turno y a los otros dos montos', async () => {
      const mocks = makeMocks();
      const a = appt({ id: 'a1', observaciones: 'nota vieja' });
      const { fixture } = await renderModal(mocks, { appointment: a });
      fixture.componentInstance.startEditingObservacionesPago();
      fixture.componentInstance.observacionesPagoInput = 'nota sin guardar';

      fixture.componentRef.setInput('appointment', appt({ id: 'a1', observaciones: 'nota vieja' }));
      fixture.detectChanges(false);

      expect(fixture.componentInstance.editingObservacionesPago).toBe(false);
      expect(fixture.componentInstance.observacionesPagoInput).toBe('nota vieja');
    });

    it('un turno nuevo (id distinto) precarga sus propios valores', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ id: 'a1', precioBono: 100 }) });

      fixture.componentRef.setInput('appointment', appt({ id: 'a2', precioBono: 500 }));
      fixture.detectChanges(false);

      expect(fixture.componentInstance.inputBono).toBe(500);
    });
  });

  describe('isFullPaymentChecked: tolerancia de centavos, no igualdad exacta', () => {
    it('un centavo de diferencia NO cuenta como pago completo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ totalPrecio: 100 }) });
      fixture.componentInstance.updateTurnModalPaymentInput(98.98);

      expect(fixture.componentInstance.isFullPaymentChecked()).toBe(false);
    });

    it('una diferencia menor a un centavo SÍ cuenta como pago completo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ totalPrecio: 100 }) });
      fixture.componentInstance.updateTurnModalPaymentInput(99.995);

      expect(fixture.componentInstance.isFullPaymentChecked()).toBe(true);
    });

    it('con total 0, nunca es "pago completo" aunque el input también sea 0', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ totalPrecio: 0 }) });
      fixture.componentInstance.updateTurnModalPaymentInput(0);

      expect(fixture.componentInstance.isFullPaymentChecked()).toBe(false);
    });
  });

  describe('onTurnModalAddPayment', () => {
    it('con monto <= 0, no llama al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt() });
      fixture.componentInstance.updateTurnModalPaymentInput(0);

      fixture.componentInstance.onTurnModalAddPayment();

      expect(mocks.appointmentsService.addPaymentWithFeedback).not.toHaveBeenCalled();
    });

    it('éxito: sincroniza el turno actualizado, resetea el input y emite appointmentUpdated', async () => {
      const appointmentUpdated = vi.fn();
      const mocks = makeMocks();
      const updated = appt({ id: 'a1', totalPrecio: 50 });
      mocks.appointmentsService.addPaymentWithFeedback.mockReturnValue(of(updated));
      const { fixture } = await render(TurnPaymentModalComponent, {
        inputs: { open: true, appointment: appt({ id: 'a1' }) },
        on: { appointmentUpdated },
        providers: [
          { provide: AppointmentsService, useValue: mocks.appointmentsService },
          { provide: ConfigurationService, useValue: mocks.whatsappConfig },
          { provide: AuthService, useValue: mocks.authService }
        ]
      });
      fixture.componentInstance.updateTurnModalPaymentInput(50);

      fixture.componentInstance.onTurnModalAddPayment();

      expect(fixture.componentInstance.appointment).toEqual(updated);
      expect(fixture.componentInstance.turnModalPaymentInput).toBe(0);
      expect(appointmentUpdated).toHaveBeenCalledWith(updated);
    });

    it('error: limpia isAddingPayment sin tocar el input', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.addPaymentWithFeedback.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderModal(mocks, { appointment: appt() });
      fixture.componentInstance.updateTurnModalPaymentInput(50);

      fixture.componentInstance.onTurnModalAddPayment();

      expect(fixture.componentInstance.isAddingPayment).toBe(false);
      expect(fixture.componentInstance.turnModalPaymentInput).toBe(50);
    });
  });

  describe('edición de precio (bono en profundidad; tratamiento/extras livianos, mismo patrón)', () => {
    it('startEditingPriceBono precarga el valor actual', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ precioBono: 200 }) });

      fixture.componentInstance.startEditingPriceBono();

      expect(fixture.componentInstance.editingPriceBono).toBe(true);
      expect(fixture.componentInstance.inputBono).toBe(200);
    });

    it('cancelEditingPriceBono descarta el cambio sin llamar al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ precioBono: 200 }) });
      fixture.componentInstance.startEditingPriceBono();
      fixture.componentInstance.inputBono = 999;

      fixture.componentInstance.cancelEditingPriceBono();

      expect(fixture.componentInstance.editingPriceBono).toBe(false);
      expect(fixture.componentInstance.inputBono).toBe(200);
      expect(mocks.appointmentsService.updateWithFeedback).not.toHaveBeenCalled();
    });

    it('un valor negativo no se guarda', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt() });
      fixture.componentInstance.inputBono = -10;

      fixture.componentInstance.savePriceBono();

      expect(mocks.appointmentsService.updateWithFeedback).not.toHaveBeenCalled();
    });

    it('éxito: sincroniza, sale del modo edición', async () => {
      const mocks = makeMocks();
      const updated = appt({ precioBono: 300 });
      mocks.appointmentsService.updateWithFeedback.mockReturnValue(of(updated));
      const { fixture } = await renderModal(mocks, { appointment: appt() });
      fixture.componentInstance.startEditingPriceBono();
      fixture.componentInstance.inputBono = 300;

      fixture.componentInstance.savePriceBono();

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1', { precioBono: 300 }, 'Bono actualizado.', 'actualizar el bono'
      );
      expect(fixture.componentInstance.editingPriceBono).toBe(false);
      expect(fixture.componentInstance.appointment).toEqual(updated);
    });

    it('error: se queda en modo edición para reintentar (no revierte el valor tipeado)', async () => {
      const mocks = makeMocks();
      mocks.appointmentsService.updateWithFeedback.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderModal(mocks, { appointment: appt() });
      fixture.componentInstance.startEditingPriceBono();
      fixture.componentInstance.inputBono = 300;

      fixture.componentInstance.savePriceBono();

      expect(fixture.componentInstance.isSavingPrice).toBe(false);
      expect(fixture.componentInstance.editingPriceBono).toBe(true);
      expect(fixture.componentInstance.inputBono).toBe(300);
    });
  });

  it('tratamiento y extras siguen el mismo patrón de guardado', async () => {
    const mocks = makeMocks();
    const { fixture } = await renderModal(mocks, { appointment: appt({ id: 'a1' }) });

    fixture.componentInstance.inputTratamiento = 150;
    fixture.componentInstance.savePriceTratamiento();
    expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
      'a1', { precioTratamiento: 150 }, 'Tratamiento actualizado.', 'actualizar el tratamiento'
    );

    fixture.componentInstance.inputExtras = 20;
    fixture.componentInstance.savePriceExtras();
    expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
      'a1', { extras: 20 }, 'Extras actualizados.', 'actualizar los extras'
    );
  });

  describe('observaciones de pago / del turno', () => {
    it('saveObservacionesPago guarda el texto y sale de edición', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ id: 'a1' }) });
      fixture.componentInstance.startEditingObservacionesPago();
      fixture.componentInstance.observacionesPagoInput = 'Pagó en efectivo';

      fixture.componentInstance.saveObservacionesPago();

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1', { observaciones: 'Pagó en efectivo' }, 'Observaciones de pago guardadas.', 'actualizar las observaciones'
      );
      expect(fixture.componentInstance.editingObservacionesPago).toBe(false);
    });

    it('saveObservacionesTurno guarda el texto y sale de edición', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt({ id: 'a1' }) });
      fixture.componentInstance.startEditingObservacionesTurno();
      fixture.componentInstance.observacionesTurnoInput = 'Llegó tarde';

      fixture.componentInstance.saveObservacionesTurno();

      expect(mocks.appointmentsService.updateWithFeedback).toHaveBeenCalledWith(
        'a1', { observacionesTurno: 'Llegó tarde' }, 'Observaciones del turno guardadas.', 'actualizar las observaciones del turno'
      );
      expect(fixture.componentInstance.editingObservacionesTurno).toBe(false);
    });
  });

  describe('close', () => {
    it('limpia el estado de edición y emite closed', async () => {
      const closed = vi.fn();
      const mocks = makeMocks();
      const { fixture } = await render(TurnPaymentModalComponent, {
        inputs: { open: true, appointment: appt() },
        on: { closed },
        providers: [
          { provide: AppointmentsService, useValue: mocks.appointmentsService },
          { provide: ConfigurationService, useValue: mocks.whatsappConfig },
          { provide: AuthService, useValue: mocks.authService }
        ]
      });
      fixture.componentInstance.startEditingPriceBono();

      fixture.componentInstance.close();

      expect(fixture.componentInstance.appointment).toBeNull();
      expect(fixture.componentInstance.editingPriceBono).toBe(false);
      expect(closed).toHaveBeenCalled();
    });
  });

  describe('WhatsApp', () => {
    it('sin teléfono del paciente, no arma link', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderModal(mocks, { appointment: appt(), patient: { telefono: '' } as Patient });
      expect(fixture.componentInstance.getWhatsAppLink()).toBeNull();
      expect(fixture.componentInstance.hasPatientPhone()).toBe(false);
    });

    it('con teléfono, arma el link con los datos del turno y el paciente', async () => {
      const mocks = makeMocks();
      const patient = { nombre: 'Ana', apellido: 'García', telefono: '1122334455' } as Patient;
      const { fixture } = await renderModal(mocks, {
        appointment: appt({ hora: '10:30:00', profesionalNombre: 'Bruno', profesionalApellido: 'Díaz' }),
        patient
      });

      expect(fixture.componentInstance.hasPatientPhone()).toBe(true);
      expect(fixture.componentInstance.getWhatsAppLink()).toBe('https://wa.me/123');
      expect(mocks.whatsappConfig.buildWhatsAppLink).toHaveBeenCalledWith('1122334455', {
        hora: '10:30', fecha: expect.any(String), profesional: 'Bruno Díaz', paciente: 'Ana García'
      });
    });
  });
});
