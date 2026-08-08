import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { AppointmentListOverflowComponent } from './appointment-list-overflow.component';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment } from '../../../../core/models';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
    FakeResizeObserver.instances.push(this);
  }
}

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-10', estado: 'PENDIENTE', ...overrides } as Appointment;
}

async function renderList(appointments: Appointment[]) {
  return render(AppointmentListOverflowComponent, {
    inputs: { appointments, identificacion: '12345678' },
    providers: [
      { provide: AuthService, useValue: { hasCapability: vi.fn(() => true), currentUser$: of({}) } }
    ]
  });
}

describe('AppointmentListOverflowComponent', () => {
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = FakeResizeObserver;
  });

  afterEach(() => {
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = originalResizeObserver;
    document.body.innerHTML = '';
  });

  describe('sin turnos en el período filtrado', () => {
    it('BUG conocido: revienta con TypeError en ngAfterViewInit — el ViewChild #apptList queda undefined porque ese div está detrás de *ngIf="appointments.length > 0", y ngAfterViewInit no lo guarda antes de leer .nativeElement. El padre (seguimiento-view) solo evita instanciar este componente si el paciente no tiene NINGÚN turno en ningún período (group.totalTurnos > 0), no si el filtro de año/mes actual da 0 resultados — así que un paciente con turnos en otros meses pero ninguno en el mes filtrado sí puede disparar esto en producción.', async () => {
      await expect(renderList([])).rejects.toThrow(/nativeElement/);
    });
  });

  describe('toggleActions: abrir/cerrar el dropdown de acciones', () => {
    it('clickear un turno abre su dropdown de acciones', async () => {
      const a = appt({ id: 'a1' });
      await renderList([a]);

      await userEvent.setup().click(screen.getByTestId('tracking-appointment-item-a1'));

      expect(screen.getByTestId('tracking-appointment-actions-a1')).toBeTruthy();
    });

    it('clickear el mismo turno ya abierto lo cierra', async () => {
      const a = appt({ id: 'a1' });
      await renderList([a]);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('tracking-appointment-item-a1'));

      await user.click(screen.getByTestId('tracking-appointment-item-a1'));

      expect(screen.queryByTestId('tracking-appointment-actions-a1')).toBeNull();
    });

    it('abrir el turno B mientras A estaba abierto cambia el dropdown al turno B', async () => {
      const a = appt({ id: 'a1' });
      const b = appt({ id: 'a2', fecha: '2026-08-11' });
      await renderList([a, b]);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('tracking-appointment-item-a1'));

      await user.click(screen.getByTestId('tracking-appointment-item-a2'));

      expect(screen.queryByTestId('tracking-appointment-actions-a1')).toBeNull();
      expect(screen.getByTestId('tracking-appointment-actions-a2')).toBeTruthy();
    });
  });

  describe('emitPayments / emitClinical', () => {
    it('emitPayments cierra el dropdown y emite appointmentClick', async () => {
      const appointmentClick = vi.fn();
      const a = appt({ id: 'a1' });
      const { fixture } = await render(AppointmentListOverflowComponent, {
        inputs: { appointments: [a], identificacion: '12345678' },
        on: { appointmentClick },
        providers: [{ provide: AuthService, useValue: { hasCapability: vi.fn(() => true), currentUser$: of({}) } }]
      });

      fixture.componentInstance.emitPayments(a);

      expect(appointmentClick).toHaveBeenCalledWith(a);
      expect(fixture.componentInstance.openActionsAppointment).toBeNull();
    });

    it('emitClinical cierra el dropdown y emite clinicalClick', async () => {
      const clinicalClick = vi.fn();
      const a = appt({ id: 'a1' });
      const { fixture } = await render(AppointmentListOverflowComponent, {
        inputs: { appointments: [a], identificacion: '12345678' },
        on: { clinicalClick },
        providers: [{ provide: AuthService, useValue: { hasCapability: vi.fn(() => true), currentUser$: of({}) } }]
      });

      fixture.componentInstance.emitClinical(a);

      expect(clinicalClick).toHaveBeenCalledWith(a);
      expect(fixture.componentInstance.openActionsAppointment).toBeNull();
    });
  });

  describe('cierre por click afuera / Escape', () => {
    it('clickear afuera de la card y del dropdown cierra las acciones', async () => {
      const a = appt({ id: 'a1' });
      await renderList([a]);
      await userEvent.setup().click(screen.getByTestId('tracking-appointment-item-a1'));
      expect(screen.getByTestId('tracking-appointment-actions-a1')).toBeTruthy();

      await userEvent.setup().click(document.body);

      expect(screen.queryByTestId('tracking-appointment-actions-a1')).toBeNull();
    });

    it('clickear dentro del dropdown (colgado de body) no lo cierra', async () => {
      const a = appt({ id: 'a1' });
      await renderList([a]);
      await userEvent.setup().click(screen.getByTestId('tracking-appointment-item-a1'));

      await userEvent.setup().click(screen.getByTestId('tracking-appointment-actions-a1'));

      expect(screen.getByTestId('tracking-appointment-actions-a1')).toBeTruthy();
    });

    it('la tecla Escape cierra las acciones', async () => {
      const a = appt({ id: 'a1' });
      await renderList([a]);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('tracking-appointment-item-a1'));

      await user.keyboard('{Escape}');

      expect(screen.queryByTestId('tracking-appointment-actions-a1')).toBeNull();
    });
  });

  describe('scroll/resize del documento cierran el dropdown (listeners fuera de la zona)', () => {
    it('un resize de window cierra las acciones abiertas', async () => {
      const a = appt({ id: 'a1' });
      const { fixture } = await renderList([a]);
      fixture.componentInstance.toggleActions(a, { currentTarget: document.createElement('div') } as unknown as Event);
      expect(fixture.componentInstance.openActionsAppointment).toBe(a);

      window.dispatchEvent(new Event('resize'));

      expect(fixture.componentInstance.openActionsAppointment).toBeNull();
    });

    it('un scroll del documento (fase de captura) cierra las acciones abiertas', async () => {
      const a = appt({ id: 'a1' });
      const { fixture } = await renderList([a]);
      fixture.componentInstance.toggleActions(a, { currentTarget: document.createElement('div') } as unknown as Event);

      document.dispatchEvent(new Event('scroll'));

      expect(fixture.componentInstance.openActionsAppointment).toBeNull();
    });

    it('sin ningún dropdown abierto, un resize no hace nada raro (guard temprano)', async () => {
      const a = appt({ id: 'a1' });
      const { fixture } = await renderList([a]);

      expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
      expect(fixture.componentInstance.openActionsAppointment).toBeNull();
    });
  });

  describe('toggleExpanded / collapse', () => {
    it('toggleExpanded alterna isExpanded y cierra las acciones abiertas', async () => {
      const a = appt({ id: 'a1' });
      const { fixture } = await renderList([a]);
      fixture.componentInstance.toggleActions(a, { currentTarget: document.createElement('div') } as unknown as Event);

      fixture.componentInstance.toggleExpanded();

      expect(fixture.componentInstance.isExpanded).toBe(true);
      expect(fixture.componentInstance.openActionsAppointment).toBeNull();
    });

    it('collapse pliega la lista y cierra las acciones (usado por el padre al cambiar de filtro)', async () => {
      const a = appt({ id: 'a1' });
      const { fixture } = await renderList([a]);
      fixture.componentInstance.isExpanded = true;
      fixture.componentInstance.toggleActions(a, { currentTarget: document.createElement('div') } as unknown as Event);

      fixture.componentInstance.collapse();

      expect(fixture.componentInstance.isExpanded).toBe(false);
      expect(fixture.componentInstance.openActionsAppointment).toBeNull();
    });
  });

  describe('ResizeObserver: detección de overflow, diferida a una macrotarea', () => {
    it('el ResizeObserver se registra sobre la lista al inicializar la vista', async () => {
      await renderList([appt()]);
      expect(FakeResizeObserver.instances).toHaveLength(1);
      expect(FakeResizeObserver.instances[0].observe).toHaveBeenCalled();
    });

    it('cuando el contenido excede la altura máxima, isOverflowing pasa a true recién tras el setTimeout', async () => {
      vi.useFakeTimers();
      const a = appt();
      const { fixture } = await renderList([a]);
      const inner = fixture.nativeElement.querySelector('.appointments-list') as HTMLDivElement;
      const wrapper = inner.parentElement as HTMLDivElement;
      wrapper.style.maxHeight = '100px';
      Object.defineProperty(inner, 'scrollHeight', { value: 200, configurable: true });

      FakeResizeObserver.instances[0].callback([{ target: inner } as unknown as ResizeObserverEntry], FakeResizeObserver.instances[0] as unknown as ResizeObserver);

      expect(fixture.componentInstance.isOverflowing).toBe(false);
      vi.runAllTimers();
      expect(fixture.componentInstance.isOverflowing).toBe(true);

      vi.useRealTimers();
    });

    it('mientras la lista está expandida, no vuelve a recalcular isOverflowing', async () => {
      vi.useFakeTimers();
      const a = appt();
      const { fixture } = await renderList([a]);
      fixture.componentInstance.isExpanded = true;
      const inner = fixture.nativeElement.querySelector('.appointments-list') as HTMLDivElement;
      const wrapper = inner.parentElement as HTMLDivElement;
      wrapper.style.maxHeight = '100px';
      Object.defineProperty(inner, 'scrollHeight', { value: 200, configurable: true });

      FakeResizeObserver.instances[0].callback([{ target: inner } as unknown as ResizeObserverEntry], FakeResizeObserver.instances[0] as unknown as ResizeObserver);
      vi.runAllTimers();

      expect(fixture.componentInstance.isOverflowing).toBe(false);

      vi.useRealTimers();
    });
  });

  it('el dropdown se cuelga de document.body al abrirse', async () => {
    const a = appt({ id: 'a1' });
    await renderList([a]);
    await userEvent.setup().click(screen.getByTestId('tracking-appointment-item-a1'));

    expect(screen.getByTestId('tracking-appointment-actions-a1').parentElement).toBe(document.body);
  });

  it('BUG: si el componente se destruye con el dropdown abierto, el nodo reubicado en document.body queda huérfano (Angular no lo limpia)', async () => {
    const a = appt({ id: 'a1' });
    const { fixture } = await renderList([a]);
    await userEvent.setup().click(screen.getByTestId('tracking-appointment-item-a1'));
    const menu = screen.getByTestId('tracking-appointment-actions-a1');

    fixture.destroy();

    // Comportamiento actual (no arreglado): a diferencia del cierre vía *ngIf (closeActions(), que sí
    // remueve el nodo — ver el comentario de `actionsMenu` en el componente), destruir el componente
    // entero NO dispara esa misma limpieza sobre un nodo que ya fue reparentado manualmente a <body>.
    // En producción esto ocurre al navegar fuera de Seguimiento (o si el *ngFor de pacientes remueve
    // esta fila) con el dropdown de acciones todavía abierto.
    expect(menu.isConnected).toBe(true);
    menu.remove();
  });
});
