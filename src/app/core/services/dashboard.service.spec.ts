import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { AppointmentsService } from './appointments.service';
import { Appointment } from '../models/appointment.model';

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1', fecha: '2026-08-07', estado: 'COMPLETADO',
    montoPago: 100, precioBono: 0, precioTratamiento: 100, extras: 0,
    ...overrides
  } as Appointment;
}

describe('DashboardService', () => {
  let service: DashboardService;
  let appointmentsService: { findByDateRange: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    appointmentsService = { findByDateRange: vi.fn(() => of([])) };
    TestBed.configureTestingModule({
      providers: [{ provide: AppointmentsService, useValue: appointmentsService }]
    });
    service = TestBed.inject(DashboardService);
  });

  it('computeDailyIncome antes de cualquier loadMonth() da [] (estado inicial real)', () => {
    let daily: unknown[] = [];
    service.dailyIncomeData$.subscribe(d => (daily = d));
    expect(daily).toEqual([]);
  });

  it('loadMonth dispara el mes principal y, si resuelve, el mes anterior', () => {
    service.loadMonth(2026, 7); // agosto (0-indexed)
    expect(appointmentsService.findByDateRange).toHaveBeenCalledTimes(2);
    expect(appointmentsService.findByDateRange).toHaveBeenNthCalledWith(1, '2026-08-01', '2026-08-31');
    expect(appointmentsService.findByDateRange).toHaveBeenNthCalledWith(2, '2026-07-01', '2026-07-31');
  });

  it('si el mes anterior falla, error$ NO se marca (solo el mes principal lo controla)', () => {
    appointmentsService.findByDateRange
      .mockReturnValueOnce(of([appointment()]))
      .mockReturnValueOnce(throwError(() => new Error('falló el mes anterior')));

    service.loadMonth(2026, 7);

    let hasError = false;
    service.error$.subscribe(v => (hasError = v));
    expect(hasError).toBe(false);

    let previousSummary: { ingresosTotales: number } | undefined;
    service.previousSummary$.subscribe(s => (previousSummary = s));
    expect(previousSummary?.ingresosTotales).toBe(0);
  });

  it('si el mes principal falla, error$ SÍ se marca', () => {
    appointmentsService.findByDateRange.mockReturnValue(throwError(() => new Error('falló')));
    service.loadMonth(2026, 7);

    let hasError = false;
    service.error$.subscribe(v => (hasError = v));
    expect(hasError).toBe(true);
  });

  it('applyDateFilter persiste entre llamadas a loadMonth (no se resetea solo)', () => {
    const monthSubject = new Subject<Appointment[]>();
    appointmentsService.findByDateRange.mockReturnValue(monthSubject.asObservable());

    service.loadMonth(2026, 7);
    monthSubject.next([
      appointment({ fecha: '2026-08-01', montoPago: 10 }),
      appointment({ fecha: '2026-08-15', montoPago: 20 })
    ]);
    service.applyDateFilter('2026-08-10', '2026-08-20');

    let summary: { ingresosTotales: number } | undefined;
    service.summary$.subscribe(s => (summary = s));
    expect(summary?.ingresosTotales).toBe(20); // solo el turno del 15, dentro del rango

    // Recargar el mismo mes sin volver a pasar el filtro: debe seguir acotado al rango anterior.
    service.loadMonth(2026, 7);
    monthSubject.next([
      appointment({ fecha: '2026-08-01', montoPago: 10 }),
      appointment({ fecha: '2026-08-15', montoPago: 20 })
    ]);

    expect(summary?.ingresosTotales).toBe(20);
  });

  describe('computeSummary()', () => {
    it('un turno CANCELADO con saldo pendiente no suma a ingresosPendientes, pero cuenta como cancelado', () => {
      appointmentsService.findByDateRange.mockReturnValue(
        of([appointment({ estado: 'CANCELADO', montoPago: 0, precioTratamiento: 500 })])
      );
      service.loadMonth(2026, 7);

      let summary: { ingresosPendientes: number; turnosCancelados: number } | undefined;
      service.summary$.subscribe(s => (summary = s));

      expect(summary?.ingresosPendientes).toBe(0);
      expect(summary?.turnosCancelados).toBe(1);
    });
  });

  it('refresh() vuelve a cargar el mismo año/mes de la última llamada a loadMonth', () => {
    service.loadMonth(2026, 7);
    appointmentsService.findByDateRange.mockClear();

    service.refresh();

    expect(appointmentsService.findByDateRange).toHaveBeenNthCalledWith(1, '2026-08-01', '2026-08-31');
  });

  it('applyDateFilter con solo "from" no filtra por "to"', () => {
    appointmentsService.findByDateRange.mockReturnValue(
      of([appointment({ fecha: '2026-08-01', montoPago: 10 }), appointment({ fecha: '2026-08-20', montoPago: 20 })])
    );
    service.loadMonth(2026, 7);
    service.applyDateFilter('2026-08-10', null);

    let summary: { ingresosTotales: number } | undefined;
    service.summary$.subscribe(s => (summary = s));
    expect(summary?.ingresosTotales).toBe(20);
  });

  it('applyDateFilter sin from ni to no filtra nada', () => {
    appointmentsService.findByDateRange.mockReturnValue(of([appointment({ montoPago: 10 }), appointment({ montoPago: 20 })]));
    service.loadMonth(2026, 7);
    service.applyDateFilter(null, null);

    let summary: { ingresosTotales: number } | undefined;
    service.summary$.subscribe(s => (summary = s));
    expect(summary?.ingresosTotales).toBe(30);
  });

  it('computeDailyIncome arma un punto por día del mes con lo realizado y lo pendiente', () => {
    appointmentsService.findByDateRange.mockReturnValue(
      of([appointment({ fecha: '2026-08-05', montoPago: 50, precioTratamiento: 80 })])
    );
    service.loadMonth(2026, 7);

    let daily: { day: string; realized: number; pending: number }[] = [];
    service.dailyIncomeData$.subscribe(d => (daily = d));

    expect(daily).toHaveLength(31);
    const day5 = daily.find(d => d.day === '05');
    expect(day5?.realized).toBe(50);
    expect(day5?.pending).toBe(30);
  });

  describe('computeProfessionalStats()', () => {
    it('"No asignado" va siempre primero, el resto ordenado alfabéticamente', () => {
      appointmentsService.findByDateRange.mockReturnValue(
        of([
          appointment({ profesionalId: 'p2', profesionalNombre: 'Bruno', profesionalApellido: 'Zeta' }),
          appointment({ profesionalId: 'p1', profesionalNombre: 'Ana', profesionalApellido: 'Alfa' }),
          appointment({ profesionalId: undefined })
        ])
      );
      service.loadMonth(2026, 7);

      let stats: { profesionalNombre: string }[] = [];
      service.professionalStats$.subscribe(s => (stats = s));

      expect(stats.map(s => s.profesionalNombre)).toEqual(['No asignado', 'Ana', 'Bruno']);
    });
  });
});
