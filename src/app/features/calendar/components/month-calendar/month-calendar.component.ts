import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './month-calendar.component.html',
  styleUrls: ['./month-calendar.component.scss']
})
export class MonthCalendarComponent implements OnInit, OnChanges {
  @Input() currentDate: Date = new Date();
  @Input() selectedDate: string | null = null;
  @Input() appointments: any[] = [];

  @Output() dateClick = new EventEmitter<string>();
  @Output() monthChange = new EventEmitter<Date>();

  calendarDays: any[] = [];
  
  weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  ngOnInit(): void {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentDate'] || changes['appointments'] || changes['selectedDate']) {
      this.generateCalendar();
    }
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
      let count = 0;
      if (this.appointments && Array.isArray(this.appointments)) {
        count = this.appointments.filter(app => app.fecha === dateStr).length;
      }
      
      this.calendarDays.push({
        type: 'day',
        day,
        dateStr,
        appointmentCount: count,
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
}

