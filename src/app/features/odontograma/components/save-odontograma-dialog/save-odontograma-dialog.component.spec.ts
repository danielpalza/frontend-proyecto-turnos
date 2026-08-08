import { render } from '@testing-library/angular';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { SaveOdontogramaDialogComponent } from './save-odontograma-dialog.component';
import { OdontogramaStateService } from '../../services/odontograma-state.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EMPTY_ANAMNESIS } from '../../../../core/utils/anamnesis.util';
import { Capability } from '../../../../core/auth/capabilities';
import { OdontogramaPagoDelta } from '../../../../core/models/odontograma.model';

function makeMocks(overrides: { canCobrar?: boolean; snapshot?: Partial<Record<string, unknown>> } = {}) {
  const snapshot = {
    precioBono: 0, precioTratamiento: 0, extras: 0, montoPago: 0,
    observaciones: '', observacionesTurno: '',
    ...overrides.snapshot
  };
  return {
    stateService: {
      comentario$: of('comentario del turno'),
      planTratamiento$: of('plan de tratamiento'),
      comentarioAnterior$: of('comentario anterior'),
      historiaClinica$: of(EMPTY_ANAMNESIS),
      refreshAppointmentPaymentSnapshot: vi.fn(() => of(void 0)),
      appointmentPaymentSnapshot: snapshot,
      saveTurnoCompleto: vi.fn((_pago: OdontogramaPagoDelta) => of(void 0))
    },
    notification: { showSuccess: vi.fn(), showError: vi.fn() },
    authService: {
      hasCapability: vi.fn((c: string) => (overrides.canCobrar ?? true) && c === Capability.TURNOS_COBRAR),
      currentUser$: of({})
    },
    router: { navigate: vi.fn() }
  };
}

async function renderDialog(mocks: ReturnType<typeof makeMocks>, inputs: Record<string, unknown> = {}) {
  return render(SaveOdontogramaDialogComponent, {
    inputs: { open: false, ...inputs },
    providers: [
      { provide: OdontogramaStateService, useValue: mocks.stateService },
      { provide: NotificationService, useValue: mocks.notification },
      { provide: AuthService, useValue: mocks.authService },
      { provide: Router, useValue: mocks.router }
    ]
  });
}

describe('SaveOdontogramaDialogComponent', () => {
  describe('open setter: prefillFromAppointment solo en la transición false -> true', () => {
    it('abrir el diálogo (false -> true) precarga el snapshot de pago', async () => {
      const mocks = makeMocks({ snapshot: { precioBono: 1500 } });
      const { fixture } = await renderDialog(mocks, { open: false });

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();

      expect(mocks.stateService.refreshAppointmentPaymentSnapshot).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.formData().precioBono).toBe('1500.00');
    });

    it('reabrir estando ya abierto no vuelve a precargar', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks, { open: true });
      mocks.stateService.refreshAppointmentPaymentSnapshot.mockClear();

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();

      expect(mocks.stateService.refreshAppointmentPaymentSnapshot).not.toHaveBeenCalled();
    });

    it('si falla el refresh del snapshot, igual aplica lo último disponible (no rompe el form)', async () => {
      const mocks = makeMocks({ snapshot: { precioBono: 700 } });
      mocks.stateService.refreshAppointmentPaymentSnapshot.mockReturnValue(throwError(() => new Error('caída de red')));
      const { fixture } = await renderDialog(mocks, { open: false });

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();

      expect(fixture.componentInstance.formData().precioBono).toBe('700.00');
    });
  });

  describe('puedeCobrar: cambia la FORMA del payload, no solo la UI', () => {
    it('con TURNOS_COBRAR, el pago lleva los 4 montos', async () => {
      const mocks = makeMocks({ canCobrar: true });
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.updateField('precioBono', '100');
      fixture.componentInstance.updateField('montoPago', '50');

      fixture.componentInstance.handleSubmit();

      const sentPago = mocks.stateService.saveTurnoCompleto.mock.calls[0][0];
      expect(sentPago).toEqual(expect.objectContaining({ precioBono: 100, montoPago: 50 }));
    });

    it('sin TURNOS_COBRAR, el pago solo lleva observacionesTurno (ni siquiera los montos en 0)', async () => {
      const mocks = makeMocks({ canCobrar: false });
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.updateField('observacionesTurno', 'Todo bien');

      fixture.componentInstance.handleSubmit();

      const sentPago = mocks.stateService.saveTurnoCompleto.mock.calls[0][0];
      expect(sentPago).toEqual({ observacionesTurno: 'Todo bien' });
      expect(sentPago).not.toHaveProperty('precioBono');
    });
  });

  describe('validación de montos negativos: solo corre si puedeCobrar', () => {
    it('con TURNOS_COBRAR y un monto negativo, bloquea el guardado', async () => {
      const mocks = makeMocks({ canCobrar: true });
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.updateField('precioBono', '-100');

      fixture.componentInstance.handleSubmit();

      expect(fixture.componentInstance.saveError()).toBe('Los montos no pueden ser negativos.');
      expect(mocks.stateService.saveTurnoCompleto).not.toHaveBeenCalled();
    });

    it('sin TURNOS_COBRAR, esa validación nunca puede dispararse (el payload no lleva montos)', async () => {
      const mocks = makeMocks({ canCobrar: false });
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.updateField('precioBono', '-100');

      fixture.componentInstance.handleSubmit();

      expect(fixture.componentInstance.saveError()).toBeNull();
      expect(mocks.stateService.saveTurnoCompleto).toHaveBeenCalled();
    });
  });

  describe('calcularTotal / calcularResto', () => {
    it('suma bono+tratamiento+extras y resta lo pagado', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.updateField('precioBono', '100');
      fixture.componentInstance.updateField('precioTratamiento', '50');
      fixture.componentInstance.updateField('extras', '25');
      fixture.componentInstance.updateField('montoPago', '75');

      expect(fixture.componentInstance.calcularTotal()).toBe('175.00');
      expect(fixture.componentInstance.calcularResto()).toBe('100.00');
    });

    it('campos vacíos se tratan como 0', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.updateField('precioBono', '');

      expect(fixture.componentInstance.calcularTotal()).toBe('0.00');
    });
  });

  describe('handleSubmit', () => {
    it('evita doble submit mientras hay un guardado en vuelo', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderDialog(mocks, { open: true });
      fixture.componentInstance.saving = true;

      fixture.componentInstance.handleSubmit();

      expect(mocks.stateService.saveTurnoCompleto).not.toHaveBeenCalled();
    });

    it('éxito: avisa, cierra el diálogo y navega a /turnos', async () => {
      const mocks = makeMocks();
      const openChange = vi.fn();
      const { fixture } = await render(SaveOdontogramaDialogComponent, {
        inputs: { open: true },
        on: { openChange },
        providers: [
          { provide: OdontogramaStateService, useValue: mocks.stateService },
          { provide: NotificationService, useValue: mocks.notification },
          { provide: AuthService, useValue: mocks.authService },
          { provide: Router, useValue: mocks.router }
        ]
      });

      fixture.componentInstance.handleSubmit();

      expect(mocks.notification.showSuccess).toHaveBeenCalled();
      expect(fixture.componentInstance.saving).toBe(false);
      expect(openChange).toHaveBeenCalledWith(false);
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/turnos']);
    });

    it('error: limpia saving y muestra un mensaje, sin navegar', async () => {
      const mocks = makeMocks();
      mocks.stateService.saveTurnoCompleto.mockReturnValue(throwError(() => new Error('falló')));
      const { fixture } = await renderDialog(mocks, { open: true });

      fixture.componentInstance.handleSubmit();

      expect(fixture.componentInstance.saving).toBe(false);
      expect(fixture.componentInstance.saveError()).toBe('Error al guardar. Verifica los datos e intenta nuevamente.');
      expect(mocks.router.navigate).not.toHaveBeenCalled();
    });
  });

  it('close resetea saveError, cierra y emite openChange(false)', async () => {
    const openChange = vi.fn();
    const mocks = makeMocks();
    const { fixture } = await render(SaveOdontogramaDialogComponent, {
      inputs: { open: true },
      on: { openChange },
      providers: [
        { provide: OdontogramaStateService, useValue: mocks.stateService },
        { provide: NotificationService, useValue: mocks.notification },
        { provide: AuthService, useValue: mocks.authService },
        { provide: Router, useValue: mocks.router }
      ]
    });
    fixture.componentInstance.saveError.set('algo');

    fixture.componentInstance.close();

    expect(fixture.componentInstance.open).toBe(false);
    expect(openChange).toHaveBeenCalledWith(false);
    expect(fixture.componentInstance.saveError()).toBeNull();
  });

  it('tieneHistoriaClinica refleja hasAnamnesis() sobre historiaClinica$', async () => {
    const mocks = makeMocks();
    mocks.stateService.historiaClinica$ = of({ items: [{ label: 'Alergias', value: 'Penicilina' }], otros: '' });
    const { fixture } = await renderDialog(mocks, { open: true });

    expect(fixture.componentInstance.tieneHistoriaClinica).toBe(true);
  });
});
