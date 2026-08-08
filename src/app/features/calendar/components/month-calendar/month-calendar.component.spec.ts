import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MonthCalendarComponent } from './month-calendar.component';
import { Appointment, Patient, Profesional } from '../../../../core/models';

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-15', estado: 'PENDIENTE', montoPago: 0, ...overrides } as Appointment;
}

describe('MonthCalendarComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateCalendar', () => {
    it('agosto 2026 arma una grilla completa en múltiplos de 7, con 31 celdas de tipo día', async () => {
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), appointments: [] }
      });

      const days = fixture.componentInstance.calendarDays;
      expect(days.length % 7).toBe(0);
      expect(days.filter(d => d.type === 'day')).toHaveLength(31);
    });

    it('cuenta total/pendientes/cancelados por día a partir de los turnos filtrados por fecha', async () => {
      const appointments = [
        appt({ id: 'a1', fecha: '2026-08-15', estado: 'PENDIENTE' }),
        appt({ id: 'a2', fecha: '2026-08-15', estado: 'CANCELADO' }),
        appt({ id: 'a3', fecha: '2026-08-15', estado: 'NO_ASISTIO' }),
        appt({ id: 'a4', fecha: '2026-08-16', estado: 'COMPLETADO' })
      ];
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), appointments }
      });

      const day15 = fixture.componentInstance.calendarDays.find(d => d.dateStr === '2026-08-15')!;
      expect(day15.total).toBe(3);
      expect(day15.pendientes).toBe(1);
      expect(day15.cancelados).toBe(2);

      const day16 = fixture.componentInstance.calendarDays.find(d => d.dateStr === '2026-08-16')!;
      expect(day16.total).toBe(1);
      expect(day16.pendientes).toBe(0);
      expect(day16.cancelados).toBe(0);
    });

    it('marca isSelected en el día que coincide con selectedDate', async () => {
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), selectedDate: '2026-08-20', appointments: [] }
      });

      const day20 = fixture.componentInstance.calendarDays.find(d => d.dateStr === '2026-08-20')!;
      expect(day20.isSelected).toBe(true);
    });

    it('re-genera la grilla cuando cambian currentDate/appointments/selectedDate (ngOnChanges)', async () => {
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), appointments: [] }
      });

      fixture.componentRef.setInput('currentDate', new Date(2026, 8, 1));
      fixture.detectChanges();

      expect(fixture.componentInstance.calendarDays.filter(d => d.type === 'day')).toHaveLength(30);
    });
  });

  describe('isToday', () => {
    it('un día que coincide con la fecha real de hoy (mismo año/mes/currentDate) da true', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 15, 10, 0, 0));

      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), appointments: [] }
      });

      expect(fixture.componentInstance.isToday(15)).toBe(true);
      expect(fixture.componentInstance.isToday(16)).toBe(false);
    });
  });

  describe('dailySummary', () => {
    it('sin selectedDate, todo en cero', async () => {
      const { fixture } = await render(MonthCalendarComponent, { inputs: { currentDate: new Date(2026, 7, 1) } });
      expect(fixture.componentInstance.dailySummary).toEqual({ total: 0, completados: 0, pendientes: 0, cancelados: 0, facturacion: 0 });
    });

    it('con selectedDate, suma facturación y clasifica por estado', async () => {
      const appointments = [
        appt({ id: 'a1', fecha: '2026-08-15', estado: 'COMPLETADO', montoPago: 1000 }),
        appt({ id: 'a2', fecha: '2026-08-15', estado: 'PENDIENTE', montoPago: 500 }),
        appt({ id: 'a3', fecha: '2026-08-15', estado: 'CANCELADO', montoPago: 0 }),
        appt({ id: 'a4', fecha: '2026-08-16', estado: 'COMPLETADO', montoPago: 9999 })
      ];
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), appointments, selectedDate: '2026-08-15' }
      });

      expect(fixture.componentInstance.dailySummary).toEqual({
        total: 3,
        completados: 1,
        pendientes: 1,
        cancelados: 1,
        facturacion: 1500
      });
    });
  });

  it('formatDate arma AAAA-MM-DD con padding, usando el año de currentDate por defecto', async () => {
    const { fixture } = await render(MonthCalendarComponent, { inputs: { currentDate: new Date(2026, 0, 1) } });
    expect(fixture.componentInstance.formatDate(7, 5)).toBe('2026-08-05');
    expect(fixture.componentInstance.formatDate(7, 5, 2027)).toBe('2027-08-05');
  });

  describe('navegación', () => {
    it('previousMonth/nextMonth emiten monthChange con el primer día del mes correspondiente', async () => {
      const monthChange = vi.fn();
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 15) },
        on: { monthChange }
      });

      fixture.componentInstance.previousMonth();
      expect(monthChange).toHaveBeenLastCalledWith(new Date(2026, 6, 1));

      fixture.componentInstance.nextMonth();
      expect(monthChange).toHaveBeenLastCalledWith(new Date(2026, 8, 1));
    });

    it('goToToday emite monthChange y dateClick con la fecha real de hoy', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0));

      const monthChange = vi.fn();
      const dateClick = vi.fn();
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2020, 0, 1) },
        on: { monthChange, dateClick }
      });

      fixture.componentInstance.goToToday();

      expect(monthChange).toHaveBeenCalledWith(new Date(2026, 7, 15, 12, 0, 0));
      expect(dateClick).toHaveBeenCalledWith('2026-08-15');
    });

    it('clickear un día del grid emite dateClick con su dateStr', async () => {
      const dateClick = vi.fn();
      await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), appointments: [] },
        on: { dateClick }
      });

      await userEvent.setup().click(screen.getByTestId('calendar-day-2026-08-10'));

      expect(dateClick).toHaveBeenCalledWith('2026-08-10');
    });
  });

  describe('búsqueda/filtro', () => {
    it('onSearchSelect de un paciente arma el filterTerm con el nombre completo y emite filterChange', async () => {
      const filterChange = vi.fn();
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1) },
        on: { filterChange }
      });

      const patient: Patient = { id: 'p1', nombre: 'Ana', apellido: 'García' } as Patient;
      fixture.componentInstance.onSearchSelect({ type: 'patient', item: patient });

      expect(fixture.componentInstance.filterTerm).toBe('Ana García');
      expect(filterChange).toHaveBeenCalledWith({ type: 'patient', term: 'Ana García' });
    });

    it('onSearchSelect de un profesional arma el filterTerm con su nombre completo', async () => {
      const filterChange = vi.fn();
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1) },
        on: { filterChange }
      });

      const prof: Profesional = { id: 'pr1', nombre: 'Bruno', apellido: 'Díaz' } as Profesional;
      fixture.componentInstance.onSearchSelect({ type: 'profesional', item: prof });

      expect(fixture.componentInstance.filterTerm).toBe('Bruno Díaz');
      expect(filterChange).toHaveBeenCalledWith({ type: 'profesional', term: 'Bruno Díaz' });
    });

    it('onSearchClear limpia filterTerm y emite filterChange type=both term vacío', async () => {
      const filterChange = vi.fn();
      const { fixture } = await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1) },
        on: { filterChange }
      });
      fixture.componentInstance.filterTerm = 'algo';

      fixture.componentInstance.onSearchClear();

      expect(fixture.componentInstance.filterTerm).toBe('');
      expect(filterChange).toHaveBeenCalledWith({ type: 'both', term: '' });
    });
  });

  describe('checkboxes de filtros rápidos', () => {
    it('tildar "Con deuda" emite pendingOnlyChange(true)', async () => {
      const pendingOnlyChange = vi.fn();
      await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), pendingOnly: false },
        on: { pendingOnlyChange }
      });

      await userEvent.setup().click(screen.getByTestId('filter-debt-checkbox'));

      expect(pendingOnlyChange).toHaveBeenCalledWith(true);
    });

    it('tildar "Pendientes" emite pendientesOnlyChange(true)', async () => {
      const pendientesOnlyChange = vi.fn();
      await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), pendientesOnly: false },
        on: { pendientesOnlyChange }
      });

      await userEvent.setup().click(screen.getByTestId('filter-pendientes-checkbox'));

      expect(pendientesOnlyChange).toHaveBeenCalledWith(true);
    });

    it('tildar "Cancelados" emite canceladosOnlyChange(true)', async () => {
      const canceladosOnlyChange = vi.fn();
      await render(MonthCalendarComponent, {
        inputs: { currentDate: new Date(2026, 7, 1), canceladosOnly: false },
        on: { canceladosOnlyChange }
      });

      await userEvent.setup().click(screen.getByTestId('filter-cancelados-checkbox'));

      expect(canceladosOnlyChange).toHaveBeenCalledWith(true);
    });
  });
});
