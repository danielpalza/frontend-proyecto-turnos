import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatDateToYYYYMMDD } from '../../../core/utils/date.utils';

interface CalendarDay {
  type: 'empty' | 'day';
  day?: number;
  dateStr?: string;
  isToday?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

// Coincide con el ancho fijo de .picker-dropdown (16.5rem) en mini-calendar-picker.component.scss.
const DROPDOWN_WIDTH = 264;
const DROPDOWN_OFFSET = 6;
const VIEWPORT_MARGIN = 8;

@Component({
  selector: 'app-mini-calendar-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-calendar-picker.component.html',
  styleUrls: ['./mini-calendar-picker.component.scss']
})
export class MiniCalendarPickerComponent implements OnChanges {
  @Input() selectedDate = '';
  @Input() referenceMonth = new Date();
  @Input() minDate = '';
  @Input() maxDate = '';
  @Input() inputId = '';

  @Output() dateChange = new EventEmitter<string>();

  isOpen = false;
  calendarDays: CalendarDay[] = [];
  dropdownPos = { top: 0, left: 0 };

  readonly weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

  private readonly months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(private elRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['referenceMonth'] || changes['selectedDate'] || changes['minDate'] || changes['maxDate']) {
      this.generateCalendar();
    }
  }

  getMonthLabel(): string {
    return `${this.months[this.referenceMonth.getMonth()]} ${this.referenceMonth.getFullYear()}`;
  }

  getDisplayLabel(): string {
    if (!this.selectedDate) {
      return 'Seleccionar';
    }

    const [year, month, day] = this.selectedDate.split('-');
    return `${day}/${month}/${year}`;
  }

  toggleOpen(event: Event): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.generateCalendar();
      const trigger = event.currentTarget as HTMLElement;
      this.dropdownPos = this.computePosition(trigger.getBoundingClientRect());
    }
  }

  // Se cierra en vez de reposicionarse: la posición calculada quedaría desalineada del trigger.
  @HostListener('window:resize')
  onWindowResize(): void {
    this.isOpen = false;
  }

  private computePosition(rect: DOMRect): { top: number; left: number } {
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_MARGIN)
    );
    const top = rect.bottom + DROPDOWN_OFFSET;
    return { top, left };
  }

  onDaySelect(day: CalendarDay): void {
    if (day.type !== 'day' || day.isDisabled || !day.dateStr) {
      return;
    }

    this.dateChange.emit(day.dateStr);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || !this.isOpen) {
      return;
    }

    if (!this.elRef.nativeElement.contains(target)) {
      this.isOpen = false;
    }
  }

  private generateCalendar(): void {
    const year = this.referenceMonth.getFullYear();
    const month = this.referenceMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const todayStr = formatDateToYYYYMMDD(new Date());

    this.calendarDays = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      this.calendarDays.push({ type: 'empty' });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = formatDateToYYYYMMDD(new Date(year, month, day));
      this.calendarDays.push({
        type: 'day',
        day,
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.selectedDate,
        isDisabled: this.isDateDisabled(dateStr)
      });
    }

    const remainingDays = 7 - (this.calendarDays.length % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        this.calendarDays.push({ type: 'empty' });
      }
    }
  }

  private isDateDisabled(dateStr: string): boolean {
    if (this.minDate && dateStr < this.minDate) {
      return true;
    }

    if (this.maxDate && dateStr > this.maxDate) {
      return true;
    }

    return false;
  }
}
