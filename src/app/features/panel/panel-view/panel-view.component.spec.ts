import { render } from '@testing-library/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { PanelViewComponent } from './panel-view.component';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardSummary, ProfessionalStats, DailyPoint } from '../../../core/models/dashboard.model';

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return { ingresosTotales: 0, ingresosPendientes: 0, turnosCompletados: 0, turnosPendientes: 0, turnosCancelados: 0, ...overrides };
}

function prof(overrides: Partial<ProfessionalStats> = {}): ProfessionalStats {
  return {
    profesionalId: 'p1', profesionalNombre: 'Ana', profesionalApellido: 'García',
    completados: 0, pendientes: 0, cancelados: 0, facturacion: 0, ...overrides
  } as ProfessionalStats;
}

function makeMocks() {
  return {
    dashboardService: {
      summary$: new Subject<DashboardSummary>(),
      previousSummary$: new Subject<DashboardSummary>(),
      dailyIncomeData$: new Subject<DailyPoint[]>(),
      professionalStats$: new Subject<ProfessionalStats[]>(),
      loading$: new Subject<boolean>(),
      error$: new Subject<boolean>(),
      loadMonth: vi.fn(),
      applyDateFilter: vi.fn(),
      refresh: vi.fn()
    },
    router: { navigate: vi.fn() }
  };
}

async function renderPanel(mocks: ReturnType<typeof makeMocks>) {
  return render(PanelViewComponent, {
    providers: [
      { provide: DashboardService, useValue: mocks.dashboardService },
      { provide: Router, useValue: mocks.router }
    ]
  });
}

describe('PanelViewComponent', () => {
  describe('sortedProfessionalStats / sortBy', () => {
    it('clickear la misma columna dos veces invierte la dirección', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.professionalStats = [
        prof({ profesionalId: 'p1', profesionalNombre: 'Bruno' }),
        prof({ profesionalId: 'p2', profesionalNombre: 'Ana' })
      ];

      fixture.componentInstance.sortBy('profesional', 'asc');
      expect(fixture.componentInstance.sortedProfessionalStats.map(p => p.profesionalNombre)).toEqual(['Ana', 'Bruno']);

      fixture.componentInstance.sortBy('profesional', 'asc');
      expect(fixture.componentInstance.sortedProfessionalStats.map(p => p.profesionalNombre)).toEqual(['Bruno', 'Ana']);
    });

    it('clickear una columna distinta resetea a su propio defaultDirection', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.professionalStats = [
        prof({ profesionalId: 'p1', facturacion: 100 }),
        prof({ profesionalId: 'p2', facturacion: 200 })
      ];

      fixture.componentInstance.sortBy('profesional', 'asc');
      fixture.componentInstance.sortBy('facturacion', 'desc');

      expect(fixture.componentInstance.sortColumn).toBe('facturacion');
      expect(fixture.componentInstance.sortDirection).toBe('desc');
      expect(fixture.componentInstance.sortedProfessionalStats.map(p => p.facturacion)).toEqual([200, 100]);
    });

    it('sin sortColumn, devuelve la lista sin ordenar', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      const stats = [prof({ profesionalId: 'p1' }), prof({ profesionalId: 'p2' })];
      fixture.componentInstance.professionalStats = stats;

      expect(fixture.componentInstance.sortedProfessionalStats).toEqual(stats);
    });

    it('sortIcon refleja columna y dirección activas', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      expect(fixture.componentInstance.sortIcon('turnos')).toBe('bi bi-arrow-down-up');

      fixture.componentInstance.sortBy('turnos', 'asc');
      expect(fixture.componentInstance.sortIcon('turnos')).toBe('bi bi-arrow-up');

      fixture.componentInstance.sortBy('turnos', 'asc');
      expect(fixture.componentInstance.sortIcon('turnos')).toBe('bi bi-arrow-down');
    });
  });

  describe('comparación mes vs mes anterior (pctChange)', () => {
    it('previous=0 y current>0 da 100% (nunca Infinity)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      mocks.dashboardService.summary$.next(summary({ ingresosTotales: 500 }));
      mocks.dashboardService.previousSummary$.next(summary({ ingresosTotales: 0 }));

      expect(fixture.componentInstance.comparison.ingresos).toBe(100);
    });

    it('previous=0 y current=0 da null (sin badge, no NaN)', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      mocks.dashboardService.summary$.next(summary({ ingresosTotales: 0 }));
      mocks.dashboardService.previousSummary$.next(summary({ ingresosTotales: 0 }));

      expect(fixture.componentInstance.comparison.ingresos).toBeNull();
      expect(fixture.componentInstance.comparisonClass(null)).toBe('d-none');
    });

    it('un cambio real calcula el porcentaje redondeado', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      mocks.dashboardService.summary$.next(summary({ ingresosTotales: 150 }));
      mocks.dashboardService.previousSummary$.next(summary({ ingresosTotales: 100 }));

      expect(fixture.componentInstance.comparison.ingresos).toBe(50);
      expect(fixture.componentInstance.comparisonLabel(50)).toBe('+50%');
      expect(fixture.componentInstance.comparisonClass(50)).toBe('comparison positive');
      expect(fixture.componentInstance.comparisonClass(-10)).toBe('comparison negative');
    });
  });

  describe('gráficos: reemplazo inmutable de datos (spread), no mutación in-place', () => {
    it('appointmentsChartData es un objeto NUEVO en cada emisión de summary$', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      const before = fixture.componentInstance.appointmentsChartData;

      mocks.dashboardService.summary$.next(summary({ turnosCompletados: 3, turnosPendientes: 1, turnosCancelados: 0 }));

      expect(fixture.componentInstance.appointmentsChartData).not.toBe(before);
      expect(fixture.componentInstance.appointmentsChartData.datasets[0].data).toEqual([3, 1, 0]);
    });

    it('lineChartData es un objeto NUEVO en cada emisión de dailyIncomeData$', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      const before = fixture.componentInstance.lineChartData;

      mocks.dashboardService.dailyIncomeData$.next([{ day: '01', realized: 100, pending: 50 } as DailyPoint]);

      expect(fixture.componentInstance.lineChartData).not.toBe(before);
      expect(fixture.componentInstance.lineChartData.labels).toEqual(['01']);
      expect(fixture.componentInstance.lineChartData.datasets[0].data).toEqual([100]);
      expect(fixture.componentInstance.lineChartData.datasets[1].data).toEqual([50]);
    });

    it('donutLegendItems se recalcula con los porcentajes correctos', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      mocks.dashboardService.summary$.next(summary({ turnosCompletados: 3, turnosPendientes: 1, turnosCancelados: 0 }));

      const completados = fixture.componentInstance.donutLegendItems.find(i => i.label === 'Completados')!;
      expect(completados.count).toBe(3);
      expect(completados.pct).toBe(75);
    });
  });

  describe('navegación de mes', () => {
    it('previousMonth/nextMonth/goToToday actualizan el rango y piden el mes al servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.currentDate = new Date(2026, 7, 15);
      mocks.dashboardService.loadMonth.mockClear();

      fixture.componentInstance.previousMonth();
      expect(mocks.dashboardService.loadMonth).toHaveBeenCalledWith(2026, 6);

      fixture.componentInstance.nextMonth();
      expect(mocks.dashboardService.loadMonth).toHaveBeenCalledWith(2026, 7);

      fixture.componentInstance.goToToday();
      const today = new Date();
      expect(mocks.dashboardService.loadMonth).toHaveBeenCalledWith(today.getFullYear(), today.getMonth());
    });

    it('getMonthName/getPrevMonthLabel derivan de currentDate', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.currentDate = new Date(2026, 0, 1);

      expect(fixture.componentInstance.getMonthName()).toBe('Enero');
      expect(fixture.componentInstance.getPrevMonthLabel()).toBe('Diciembre 2025');
    });
  });

  describe('filtro de fechas: los extremos se acomodan entre sí', () => {
    it('mover "desde" más allá de "hasta" empuja "hasta" junto con él', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.dateTo = '2026-08-05';

      fixture.componentInstance.onDateFromChange('2026-08-10');

      expect(fixture.componentInstance.dateTo).toBe('2026-08-10');
      expect(mocks.dashboardService.applyDateFilter).toHaveBeenCalledWith('2026-08-10', '2026-08-10');
    });

    it('mover "hasta" antes de "desde" empuja "desde" junto con él', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.dateFrom = '2026-08-10';

      fixture.componentInstance.onDateToChange('2026-08-05');

      expect(fixture.componentInstance.dateFrom).toBe('2026-08-05');
    });
  });

  describe('acciones simples', () => {
    it('refresh delega en el servicio', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      fixture.componentInstance.refresh();
      expect(mocks.dashboardService.refresh).toHaveBeenCalled();
    });

    it('goToTurnos/goToConfiguraciones navegan a la ruta correspondiente', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);

      fixture.componentInstance.goToTurnos();
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/turnos']);

      fixture.componentInstance.goToConfiguraciones();
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/configuraciones']);
    });
  });

  describe('helpers de presentación', () => {
    it('getInitials arma hasta 2 iniciales en mayúscula', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      expect(fixture.componentInstance.getInitials('ana garcía lópez')).toBe('AG');
    });

    it('getProfesionalFullName cae a "No asignado" sin nombre', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      expect(fixture.componentInstance.getProfesionalFullName(prof({ profesionalNombre: '', profesionalApellido: '' }))).toBe('No asignado');
    });

    it('getCompletionRate: 0 turnos da 0%, evita división por cero', async () => {
      const mocks = makeMocks();
      const { fixture } = await renderPanel(mocks);
      expect(fixture.componentInstance.getCompletionRate(prof())).toBe(0);
      expect(fixture.componentInstance.getCompletionRate(prof({ completados: 3, pendientes: 1, cancelados: 0 }))).toBe(75);
    });
  });
});
