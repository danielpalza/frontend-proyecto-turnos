import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../../../core/models';
import { formatCurrency } from '../../../../core/utils/currency.util';
import { formatDate as formatDateShared, getAppointmentColor as getAppointmentColorShared } from '../../utils/seguimiento-display.util';

@Component({
  selector: 'app-appointment-list-overflow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-list-overflow.component.html',
  styleUrls: ['./appointment-list-overflow.component.scss']
})
export class AppointmentListOverflowComponent implements AfterViewInit, OnDestroy {
  @Input() appointments: Appointment[] = [];
  @Input() identificacion!: string;
  @Output() appointmentClick = new EventEmitter<Appointment>();

  @ViewChild('apptList') private readonly apptList!: ElementRef<HTMLDivElement>;

  isOverflowing = false;
  isExpanded = false;

  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(entries => this.onResize(entries));
    this.resizeObserver.observe(this.apptList.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  formatDate(dateStr: string): string {
    return formatDateShared(dateStr);
  }

  getAppointmentColor(appointment: Appointment): string {
    return getAppointmentColorShared(appointment);
  }

  formatCurrency(amount: number | undefined): string {
    return formatCurrency(amount);
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  /** Usado por el padre para colapsar la lista al cambiar el filtro de año/mes. */
  collapse(): void {
    this.isExpanded = false;
  }

  /**
   * Se difiere a una macrotarea aparte para que la actualización de estado nunca ocurra dentro del mismo ciclo de
   * refresco de Angular que la generó (evita NG0103 por reentrancia, ya que el navegador puede notificar el tamaño
   * inicial de un elemento observado de forma casi síncrona al llamar a `observe()`).
   */
  private onResize(entries: ResizeObserverEntry[]): void {
    setTimeout(() => this.applyResize(entries));
  }

  private applyResize(entries: ResizeObserverEntry[]): void {
    if (this.isExpanded) return;
    entries.forEach(entry => {
      const inner = entry.target as HTMLDivElement;
      const wrapper = inner.parentElement;
      if (!wrapper) return;
      const maxHeight = parseFloat(getComputedStyle(wrapper).maxHeight) || 0;
      const isOverflowing = inner.scrollHeight > maxHeight + 1;
      if (isOverflowing !== this.isOverflowing) {
        this.isOverflowing = isOverflowing;
        this.ngZone.run(() => this.cdr.markForCheck());
      }
    });
  }
}
