import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Appointment } from '../models/appointment.model';
import { DashboardSummary, ProfessionalStats, DailyPoint } from '../models/dashboard.model';
import { AppointmentsService } from './appointments.service';
import { formatDateToYYYYMMDD } from '../utils/date.utils';
import { fullName } from '../utils/full-name.util';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private allMonthAppointments$ = new BehaviorSubject<Appointment[]>([]);
  private filteredAppointments$ = new BehaviorSubject<Appointment[]>([]);
  private previousMonthAppointments$ = new BehaviorSubject<Appointment[]>([]);

  private isLoading$ = new BehaviorSubject<boolean>(false);
  private hasError$ = new BehaviorSubject<boolean>(false);

  private currentYear = 0;
  private currentMonth = 0;

  readonly loading$ = this.isLoading$.asObservable();
  readonly error$ = this.hasError$.asObservable();

  readonly summary$: Observable<DashboardSummary> = this.filteredAppointments$.pipe(
    map(a => this.computeSummary(a))
  );

  readonly previousSummary$: Observable<DashboardSummary> = this.previousMonthAppointments$.pipe(
    map(a => this.computeSummary(a))
  );

  readonly professionalStats$: Observable<ProfessionalStats[]> = this.filteredAppointments$.pipe(
    map(a => this.computeProfessionalStats(a))
  );

  readonly dailyIncomeData$: Observable<DailyPoint[]> = this.allMonthAppointments$.pipe(
    map(a => this.computeDailyIncome(a))
  );

  constructor(private appointmentsService: AppointmentsService) {}

  loadMonth(year: number, month: number): void {
    this.currentYear = year;
    this.currentMonth = month;
    this.isLoading$.next(true);
    this.hasError$.next(false);

    const start = formatDateToYYYYMMDD(new Date(year, month, 1));
    const end = formatDateToYYYYMMDD(new Date(year, month + 1, 0));

    this.appointmentsService.findByDateRange(start, end).subscribe({
      next: appointments => {
        this.allMonthAppointments$.next(appointments);
        this.filteredAppointments$.next(appointments);
        this.isLoading$.next(false);
        this.loadPreviousMonth(year, month);
      },
      error: () => {
        this.hasError$.next(true);
        this.isLoading$.next(false);
      }
    });
  }

  applyDateFilter(from: string | null, to: string | null): void {
    const all = this.allMonthAppointments$.getValue();
    if (!from && !to) {
      this.filteredAppointments$.next(all);
      return;
    }
    this.filteredAppointments$.next(
      all.filter(a => {
        if (from && a.fecha < from) return false;
        if (to && a.fecha > to) return false;
        return true;
      })
    );
  }

  refresh(): void {
    this.loadMonth(this.currentYear, this.currentMonth);
  }

  private loadPreviousMonth(year: number, month: number): void {
    const prevStart = formatDateToYYYYMMDD(new Date(year, month - 1, 1));
    const prevEnd = formatDateToYYYYMMDD(new Date(year, month, 0));
    this.appointmentsService.findByDateRange(prevStart, prevEnd).subscribe({
      next: appointments => this.previousMonthAppointments$.next(appointments),
      error: () => this.previousMonthAppointments$.next([])
    });
  }

  private computeSummary(appointments: Appointment[]): DashboardSummary {
    let ingresosTotales = 0;
    let ingresosPendientes = 0;
    let turnosCompletados = 0;
    let turnosPendientes = 0;
    let turnosCancelados = 0;

    for (const a of appointments) {
      const monto = a.montoPago ?? 0;
      const costoTotal = (a.extras ?? 0) + (a.precioBono ?? 0) + (a.precioTratamiento ?? 0);
      const pendiente = costoTotal - monto;

      ingresosTotales += monto;
      if (pendiente > 0) ingresosPendientes += pendiente;

      if (a.estado === 'COMPLETADO') turnosCompletados++;
      else if (a.estado === 'PENDIENTE') turnosPendientes++;
      else if (a.estado === 'CANCELADO' || a.estado === 'NO_ASISTIO') turnosCancelados++;
    }

    return { ingresosTotales, ingresosPendientes, turnosCompletados, turnosPendientes, turnosCancelados };
  }

  private computeProfessionalStats(appointments: Appointment[]): ProfessionalStats[] {
    const statsMap = new Map<string | null, ProfessionalStats>();

    for (const a of appointments) {
      const key = a.profesionalId ?? null;
      const nombre = a.profesionalId ? (a.profesionalNombre ?? '') : 'No asignado';
      const apellido = a.profesionalId ? (a.profesionalApellido ?? '') : '';

      if (!statsMap.has(key)) {
        statsMap.set(key, { profesionalId: key, profesionalNombre: nombre, profesionalApellido: apellido, completados: 0, pendientes: 0, cancelados: 0, facturacion: 0 });
      }

      const stats = statsMap.get(key)!;
      stats.facturacion += a.montoPago ?? 0;

      if (a.estado === 'COMPLETADO') stats.completados++;
      else if (a.estado === 'PENDIENTE') stats.pendientes++;
      else if (a.estado === 'CANCELADO' || a.estado === 'NO_ASISTIO') stats.cancelados++;
    }

    const unassigned = statsMap.get(null);
    const result: ProfessionalStats[] = [];
    if (unassigned) result.push(unassigned);

    const assigned = [...statsMap.entries()]
      .filter(([k]) => k !== null)
      .map(([, s]) => s)
      .sort((a, b) => fullName(a.profesionalNombre, a.profesionalApellido).localeCompare(fullName(b.profesionalNombre, b.profesionalApellido)));

    return [...result, ...assigned];
  }

  private computeDailyIncome(appointments: Appointment[]): DailyPoint[] {
    if (this.currentYear === 0) return [];
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const result: DailyPoint[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayAppts = appointments.filter(a => a.fecha === dayStr);
      const realized = dayAppts.reduce((sum, a) => sum + (a.montoPago ?? 0), 0);
      const pending = dayAppts.reduce((sum, a) => {
        const total = (a.extras ?? 0) + (a.precioBono ?? 0) + (a.precioTratamiento ?? 0);
        return sum + Math.max(0, total - (a.montoPago ?? 0));
      }, 0);
      result.push({ day: String(d).padStart(2, '0'), realized, pending });
    }

    return result;
  }
}
