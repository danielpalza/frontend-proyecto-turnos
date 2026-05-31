import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatDateToYYYYMMDD } from '../../../core/utils/date.utils';
import { MiniCalendarPickerComponent } from '../../../shared';

@Component({
  selector: 'app-panel-view',
  standalone: true,
  imports: [CommonModule, MiniCalendarPickerComponent],
  templateUrl: './panel-view.component.html',
  styleUrls: ['./panel-view.component.scss']
})
export class PanelViewComponent implements OnInit {
  currentDate = new Date();
  dateFrom = '';
  dateTo = '';

  private readonly months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  ngOnInit(): void {
    this.applyMonthRange();
  }

  getMonthName(): string {
    return this.months[this.currentDate.getMonth()];
  }

  previousMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.applyMonthRange();
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.applyMonthRange();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.applyMonthRange(this.getTodayInCurrentMonth());
  }

  onDateFromChange(value: string): void {
    this.dateFrom = value;
    if (this.dateFrom > this.dateTo) {
      this.dateTo = this.dateFrom;
    }
  }

  onDateToChange(value: string): void {
    this.dateTo = value;
    if (this.dateTo < this.dateFrom) {
      this.dateFrom = this.dateTo;
    }
  }

  refresh(): void {
    // TODO: conectar con dashboard.service cuando exista el backend
  }

  private applyMonthRange(preferredTo?: string): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    this.dateFrom = formatDateToYYYYMMDD(new Date(year, month, 1));
    this.dateTo = preferredTo ?? formatDateToYYYYMMDD(new Date(year, month, lastDay));
  }

  private getTodayInCurrentMonth(): string | undefined {
    const today = new Date();
    if (
      today.getFullYear() === this.currentDate.getFullYear() &&
      today.getMonth() === this.currentDate.getMonth()
    ) {
      return formatDateToYYYYMMDD(today);
    }

    return undefined;
  }
}
