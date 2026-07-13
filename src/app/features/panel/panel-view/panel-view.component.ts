import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { formatDateToYYYYMMDD } from '../../../core/utils/date.utils';
import { MiniCalendarPickerComponent } from '../../../shared';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardSummary, ProfessionalStats } from '../../../core/models/dashboard.model';
import { fullName } from '../../../core/utils/full-name.util';
import { formatCurrency as formatCurrencyShared } from '../../../core/utils/currency.util';

interface DonutLegendItem {
  label: string;
  color: string;
  count: number;
  pct: number;
  pctColor: string;
}

interface Comparison {
  ingresos: number | null;
  pendientes: number | null;
  completados: number | null;
}

type ProfessionalSortColumn = 'profesional' | 'turnos' | 'facturacion' | 'completitud';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-panel-view',
  standalone: true,
  imports: [CommonModule, MiniCalendarPickerComponent, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './panel-view.component.html',
  styleUrls: ['./panel-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelViewComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  dateFrom = '';
  dateTo = '';

  summary: DashboardSummary = { ingresosTotales: 0, ingresosPendientes: 0, turnosCompletados: 0, turnosPendientes: 0, turnosCancelados: 0 };
  professionalStats: ProfessionalStats[] = [];
  isLoading = false;
  hasError = false;
  comparison: Comparison = { ingresos: null, pendientes: null, completados: null };
  donutLegendItems: DonutLegendItem[] = [];

  sortColumn: ProfessionalSortColumn | null = null;
  sortDirection: SortDirection = 'asc';

  // Line chart
  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Ingresos realizados',
        data: [],
        borderColor: '#198754',
        backgroundColor: 'rgba(25,135,84,0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#198754',
        borderWidth: 2
      },
      {
        label: 'Ingresos pendientes',
        data: [],
        borderColor: '#fd7e14',
        backgroundColor: 'rgba(253,126,20,0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#fd7e14',
        borderWidth: 2
      }
    ]
  };

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { font: { size: 11 }, maxRotation: 0, maxTicksLimit: 10 }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          font: { size: 11 },
          callback: v => `$${Number(v).toLocaleString('es-AR')}`
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })}`
        }
      }
    }
  };

  // Donut chart
  appointmentsChartData: ChartData<'doughnut'> = {
    labels: ['Completados', 'Pendientes', 'Cancelados'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#01E17B', '#ffc107', '#dc3545'], borderWidth: 0 }]
  };

  appointmentsChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.formattedValue}` } } }
  };

  readonly donutPlugins = [{
    id: 'centerText',
    beforeDraw: (chart: any) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const data = chart.data.datasets[0]?.data as number[] ?? [];
      const total = data.reduce((a: number, b: number) => a + (b || 0), 0);
      if (total === 0) return;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 1.625rem system-ui, sans-serif';
      ctx.fillStyle = '#212529';
      ctx.fillText(String(total), x, y - 9);
      ctx.font = '0.75rem system-ui, sans-serif';
      ctx.fillStyle = '#6c757d';
      ctx.fillText('Total', x, y + 14);
      ctx.restore();
    }
  }];

  private readonly months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dashboardService.summary$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.summary = s;
      this.appointmentsChartData = {
        ...this.appointmentsChartData,
        datasets: [{ ...this.appointmentsChartData.datasets[0], data: [s.turnosCompletados, s.turnosPendientes, s.turnosCancelados] }]
      };
      this.updateDonutLegend(s);
      this.cdr.markForCheck();
    });

    combineLatest([this.dashboardService.summary$, this.dashboardService.previousSummary$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([curr, prev]) => {
        this.comparison = {
          ingresos: this.pctChange(curr.ingresosTotales, prev.ingresosTotales),
          pendientes: this.pctChange(curr.ingresosPendientes, prev.ingresosPendientes),
          completados: this.pctChange(curr.turnosCompletados, prev.turnosCompletados)
        };
        this.cdr.markForCheck();
      });

    this.dashboardService.dailyIncomeData$.pipe(takeUntil(this.destroy$)).subscribe(daily => {
      this.lineChartData = {
        labels: daily.map(d => d.day),
        datasets: [
          { ...this.lineChartData.datasets[0], data: daily.map(d => d.realized) },
          { ...this.lineChartData.datasets[1], data: daily.map(d => d.pending) }
        ]
      };
      this.cdr.markForCheck();
    });

    this.dashboardService.professionalStats$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.professionalStats = s;
      this.cdr.markForCheck();
    });
    this.dashboardService.loading$.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.isLoading = v;
      this.cdr.markForCheck();
    });
    this.dashboardService.error$.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.hasError = v;
      this.cdr.markForCheck();
    });

    this.applyMonthRange();
    this.dashboardService.loadMonth(this.currentDate.getFullYear(), this.currentDate.getMonth());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getMonthName(): string {
    return this.months[this.currentDate.getMonth()];
  }

  getPrevMonthLabel(): string {
    const d = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    return `${this.months[d.getMonth()]} ${d.getFullYear()}`;
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.applyMonthRange();
    this.dashboardService.loadMonth(this.currentDate.getFullYear(), this.currentDate.getMonth());
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.applyMonthRange();
    this.dashboardService.loadMonth(this.currentDate.getFullYear(), this.currentDate.getMonth());
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.applyMonthRange();
    this.dashboardService.loadMonth(this.currentDate.getFullYear(), this.currentDate.getMonth());
  }

  onDateFromChange(value: string): void {
    this.dateFrom = value;
    if (this.dateFrom > this.dateTo) this.dateTo = this.dateFrom;
    this.dashboardService.applyDateFilter(this.dateFrom, this.dateTo);
  }

  onDateToChange(value: string): void {
    this.dateTo = value;
    if (this.dateTo < this.dateFrom) this.dateFrom = this.dateTo;
    this.dashboardService.applyDateFilter(this.dateFrom, this.dateTo);
  }

  refresh(): void {
    this.dashboardService.refresh();
  }

  goToTurnos(): void {
    this.router.navigate(['/turnos']);
  }

  formatCurrency(value: number): string {
    return formatCurrencyShared(value);
  }

  getInitials(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getProfesionalFullName(prof: ProfessionalStats): string {
    return fullName(prof.profesionalNombre, prof.profesionalApellido) || 'No asignado';
  }

  getCompletionRate(prof: ProfessionalStats): number {
    const total = prof.completados + prof.pendientes + prof.cancelados;
    return total === 0 ? 0 : Math.round((prof.completados / total) * 100);
  }

  get sortedProfessionalStats(): ProfessionalStats[] {
    if (!this.sortColumn) return this.professionalStats;

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.professionalStats].sort((a, b) => {
      switch (this.sortColumn) {
        case 'profesional':
          return this.getProfesionalFullName(a).localeCompare(this.getProfesionalFullName(b), 'es') * dir;
        case 'turnos':
          return (a.completados - b.completados) * dir;
        case 'facturacion':
          return (a.facturacion - b.facturacion) * dir;
        case 'completitud':
          return (this.getCompletionRate(a) - this.getCompletionRate(b)) * dir;
        default:
          return 0;
      }
    });
  }

  sortBy(column: ProfessionalSortColumn, defaultDirection: SortDirection = 'asc'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = defaultDirection;
    }
    this.cdr.markForCheck();
  }

  sortIcon(column: ProfessionalSortColumn): string {
    if (this.sortColumn !== column) return 'bi bi-arrow-down-up';
    return this.sortDirection === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
  }

  comparisonLabel(pct: number | null): string {
    if (pct === null) return '';
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  }

  comparisonClass(pct: number | null): string {
    if (pct === null) return 'd-none';
    return pct >= 0 ? 'comparison positive' : 'comparison negative';
  }

  comparisonIcon(pct: number | null): string {
    if (pct === null) return '';
    return pct >= 0 ? 'bi bi-arrow-up-short' : 'bi bi-arrow-down-short';
  }

  private pctChange(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  }

  private updateDonutLegend(s: DashboardSummary): void {
    const total = s.turnosCompletados + s.turnosPendientes + s.turnosCancelados;
    const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 100);
    this.donutLegendItems = [
      { label: 'Completados', color: '#01E17B', count: s.turnosCompletados, pct: pct(s.turnosCompletados), pctColor: 'rgba(1,225,123,0.12)' },
      { label: 'Pendientes', color: '#ffc107', count: s.turnosPendientes, pct: pct(s.turnosPendientes), pctColor: 'rgba(255,193,7,0.15)' },
      { label: 'Cancelados', color: '#dc3545', count: s.turnosCancelados, pct: pct(s.turnosCancelados), pctColor: 'rgba(220,53,69,0.12)' }
    ];
  }

  private applyMonthRange(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    this.dateFrom = formatDateToYYYYMMDD(new Date(year, month, 1));
    this.dateTo = formatDateToYYYYMMDD(new Date(year, month, lastDay));
  }
}
