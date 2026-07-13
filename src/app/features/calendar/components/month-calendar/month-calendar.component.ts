import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, Profesional, Patient } from '../../../../core/models';
import { SearchInputComponent, SearchResult } from '../../../../shared';
import { fullName } from '../../../../core/utils/full-name.util';
import { formatCurrency as formatCurrencyShared } from '../../../../core/utils/currency.util';

interface CalendarDay {
  type: 'empty' | 'day';
  day?: number;
  dateStr?: string;
  total?: number;
  pendientes?: number;
  cancelados?: number;
  isToday?: boolean;
  isSelected?: boolean;
}

interface DailySummary {
  total: number;
  completados: number;
  pendientes: number;
  cancelados: number;
  facturacion: number;
}

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchInputComponent],
  templateUrl: './month-calendar.component.html',
  styleUrls: ['./month-calendar.component.scss']
})
export class MonthCalendarComponent implements OnInit, OnChanges {
  @Input() currentDate: Date = new Date();
  @Input() selectedDate: string | null = null;
  @Input() appointments: Appointment[] = [];
  @Input() profesionales: Profesional[] = [];
  @Input() patients: Patient[] = [];
  @Input() pendingOnly: boolean = false;
  @Input() pendientesOnly: boolean = false;
  @Input() canceladosOnly: boolean = false;

  @Output() dateClick = new EventEmitter<string>();
  @Output() monthChange = new EventEmitter<Date>();
  @Output() filterChange = new EventEmitter<{ type: 'patient' | 'profesional' | 'both'; term: string }>();
  @Output() pendingOnlyChange = new EventEmitter<boolean>();
  @Output() pendientesOnlyChange = new EventEmitter<boolean>();
  @Output() canceladosOnlyChange = new EventEmitter<boolean>();

  calendarDays: CalendarDay[] = [];

  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  filterTerm = '';

  ngOnInit(): void {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentDate'] || changes['appointments'] || changes['selectedDate']) {
      this.generateCalendar();
    }
  }

  private isCompletado(a: Appointment): boolean {
    return a.estado === 'COMPLETADO';
  }

  private isPendiente(a: Appointment): boolean {
    return a.estado === 'PENDIENTE';
  }

  private isCancelado(a: Appointment): boolean {
    return a.estado === 'CANCELADO' || a.estado === 'NO_ASISTIO';
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    this.calendarDays = [];

    // Días vacíos al inicio
    for (let i = 0; i < startDayOfWeek; i++) {
      this.calendarDays.push({ type: 'empty' });
    }

    // Días del mes
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = this.formatDate(month, day);
      const dayAppointments = (this.appointments || []).filter(a => a.fecha === dateStr);

      this.calendarDays.push({
        type: 'day',
        day,
        dateStr,
        total: dayAppointments.length,
        pendientes: dayAppointments.filter(a => this.isPendiente(a)).length,
        cancelados: dayAppointments.filter(a => this.isCancelado(a)).length,
        isToday: this.isToday(day),
        isSelected: this.selectedDate === dateStr
      });
    }

    // Completar última semana
    const remainingDays = 7 - (this.calendarDays.length % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        this.calendarDays.push({ type: 'empty' });
      }
    }
  }

  get dailySummary(): DailySummary {
    const dayAppointments = this.selectedDate
      ? (this.appointments || []).filter(a => a.fecha === this.selectedDate)
      : [];

    let completados = 0;
    let pendientes = 0;
    let cancelados = 0;
    let facturacion = 0;

    for (const a of dayAppointments) {
      facturacion += a.montoPago ?? 0;
      if (this.isCompletado(a)) completados++;
      else if (this.isPendiente(a)) pendientes++;
      else if (this.isCancelado(a)) cancelados++;
    }

    return { total: dayAppointments.length, completados, pendientes, cancelados, facturacion };
  }

  formatCurrency(value: number): string {
    return formatCurrencyShared(value);
  }

  formatDate(month: number, day: number, year?: number): string {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const y = year !== undefined ? year : this.currentDate.getFullYear();
    return `${y}-${m}-${d}`;
  }

  isToday(day: number): boolean {
    const today = new Date();
    return (
      today.getFullYear() === this.currentDate.getFullYear() &&
      today.getMonth() === this.currentDate.getMonth() &&
      today.getDate() === day
    );
  }

  getMonthName(): string {
    return this.months[this.currentDate.getMonth()];
  }

  previousMonth(): void {
    const newDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.monthChange.emit(newDate);
  }

  nextMonth(): void {
    const newDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.monthChange.emit(newDate);
  }

  goToToday(): void {
    const today = new Date();
    this.monthChange.emit(today);
    // Pasar el año correcto de today para evitar usar this.currentDate.getFullYear()
    this.dateClick.emit(this.formatDate(today.getMonth(), today.getDate(), today.getFullYear()));
  }

  onDateClick(dateStr: string): void {
    this.dateClick.emit(dateStr);
  }

  onSearchSelect(result: SearchResult): void {
    this.filterTerm = result.type === 'patient'
      ? fullName((result.item as Patient).nombre, (result.item as Patient).apellido)
      : fullName((result.item as Profesional).nombre, (result.item as Profesional).apellido);
    this.filterChange.emit({ type: result.type, term: this.filterTerm });
  }

  onSearchClear(): void {
    this.filterTerm = '';
    this.filterChange.emit({ type: 'both', term: '' });
  }

  onSearchChange(term: string): void {
    this.filterTerm = term;
    this.filterChange.emit({ type: 'both', term });
  }

  onPendingOnlyChange(event: Event): void {
    this.pendingOnlyChange.emit((event.target as HTMLInputElement).checked);
  }

  onPendientesOnlyChange(event: Event): void {
    this.pendientesOnlyChange.emit((event.target as HTMLInputElement).checked);
  }

  onCanceladosOnlyChange(event: Event): void {
    this.canceladosOnlyChange.emit((event.target as HTMLInputElement).checked);
  }
}
