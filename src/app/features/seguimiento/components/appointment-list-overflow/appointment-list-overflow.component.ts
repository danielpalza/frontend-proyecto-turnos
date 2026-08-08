import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../../../core/models';
import { Capability } from '../../../../core/auth/capabilities';
import { CanDirective } from '../../../../shared/directives/can.directive';
import { formatCurrency } from '../../../../core/utils/currency.util';
import { formatDate as formatDateShared, getAppointmentColor as getAppointmentColorShared } from '../../utils/seguimiento-display.util';

/** Separación vertical entre el badge y el dropdown de acciones, en px. */
const DROPDOWN_OFFSET = 6;
/** Margen mínimo contra los bordes del área visible, en px. */
const VIEWPORT_MARGIN = 8;
/** Medidas del dropdown: tres botones de 2.5rem con gap y padding de 0.4rem, más los bordes. */
const DROPDOWN_WIDTH = 148;
const DROPDOWN_HEIGHT = 55;

@Component({
  selector: 'app-appointment-list-overflow',
  standalone: true,
  imports: [CommonModule, CanDirective],
  templateUrl: './appointment-list-overflow.component.html',
  styleUrls: ['./appointment-list-overflow.component.scss']
})
export class AppointmentListOverflowComponent implements OnDestroy {
  readonly Capability = Capability;
  @Input() appointments: Appointment[] = [];
  @Input() identificacion!: string;
  /** Acción "pagos y observaciones" del dropdown (abre el modal de cobros). */
  @Output() appointmentClick = new EventEmitter<Appointment>();
  /** Acción "resumen clínico" del dropdown. */
  @Output() clinicalClick = new EventEmitter<Appointment>();
  /** Acción "documentos del turno" del dropdown. */
  @Output() documentsClick = new EventEmitter<Appointment>();

  /**
   * `#apptList` está detrás de `*ngIf="appointments.length > 0"`: cuando el filtro año/mes deja al
   * paciente sin turnos, el div no se renderiza y esta referencia queda `undefined`. Usar un setter
   * (en vez de `ngAfterViewInit` + `!`) evita el crash y además reengancha el `ResizeObserver` solo
   * cuando el div vuelve a aparecer (p.ej. al cambiar el filtro a un año con turnos) — mismo patrón
   * que `actionsMenu` acá abajo, que ya resuelve el mismo problema para ese otro `@ViewChild`.
   */
  @ViewChild('apptList') set apptList(ref: ElementRef<HTMLDivElement> | undefined) {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (!ref) {
      this.isOverflowing = false;
      return;
    }
    this.resizeObserver = new ResizeObserver(entries => this.onResize(entries));
    this.resizeObserver.observe(ref.nativeElement);
  }

  /**
   * El dropdown se saca de la card y se cuelga de `<body>` apenas se renderiza. Dentro de la card no
   * hay forma de que quede bien: `.appointments-list-wrapper` y `.patients-list` lo recortan con sus
   * `overflow`, y `.patient-card:hover` aplica un `transform` que convierte a la card en el bloque
   * contenedor del `position: fixed` justo cuando el mouse está encima.
   *
   * Angular lo sigue destruyendo bien al cerrar: su `removeChild` llama a `node.remove()`, que no
   * depende de quién sea el padre.
   */
  @ViewChild('actionsMenu') set actionsMenu(ref: ElementRef<HTMLElement> | undefined) {
    this.menuElement = ref?.nativeElement;
    if (this.menuElement) document.body.appendChild(this.menuElement);
  }

  isOverflowing = false;
  isExpanded = false;

  /** Turno cuyo dropdown de acciones está abierto, o `null` si no hay ninguno. */
  openActionsAppointment: Appointment | null = null;
  dropdownPos = { top: 0, left: 0 };

  private resizeObserver?: ResizeObserver;
  private dismissTeardown?: () => void;
  private menuElement?: HTMLElement;

  constructor(
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef<HTMLElement>
  ) {}

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.detachDismissListeners();
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
    this.closeActions();
  }

  /** Usado por el padre para colapsar la lista al cambiar el filtro de año/mes. */
  collapse(): void {
    this.isExpanded = false;
    this.closeActions();
  }

  /**
   * Abre (o cierra, si ya estaba abierto para ese turno) el dropdown de acciones del badge.
   *
   * Se posiciona a partir del rectángulo del badge, en coordenadas de viewport (el dropdown cuelga
   * de `<body>`, ver `actionsMenu`).
   */
  toggleActions(appointment: Appointment, event: Event): void {
    if (this.openActionsAppointment?.id === appointment.id) {
      this.closeActions();
      return;
    }
    const badge = event.currentTarget as HTMLElement | null;
    if (!badge) return;
    this.openActionsAppointment = appointment;
    this.dropdownPos = this.computePosition(badge.getBoundingClientRect());
    this.attachDismissListeners();
  }

  closeActions(): void {
    this.openActionsAppointment = null;
    this.detachDismissListeners();
  }

  emitPayments(appointment: Appointment): void {
    this.closeActions();
    this.appointmentClick.emit(appointment);
  }

  emitClinical(appointment: Appointment): void {
    this.closeActions();
    this.clinicalClick.emit(appointment);
  }

  emitDocuments(appointment: Appointment): void {
    this.closeActions();
    this.documentsClick.emit(appointment);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openActionsAppointment) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // Ni el badge ni el dropdown cierran por acá: el toggle del badge y los botones del dropdown ya
    // manejan su propio cierre. El dropdown se chequea aparte porque cuelga de <body>.
    const isInside = this.elRef.nativeElement.contains(target) || !!this.menuElement?.contains(target);
    if (!isInside) this.closeActions();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeActions();
  }

  /**
   * El dropdown está fijo al viewport mientras el badge se mueve con la página, así que cualquier
   * scroll o resize lo dejaría desalineado: se cierra en vez de reposicionarse.
   *
   * El scroll se escucha en fase de captura sobre `document` porque el evento no burbujea y en
   * Seguimiento quien scrollea no es la ventana sino `.patients-list` (`overflow-y: auto`).
   *
   * Son listeners nativos, fuera de Angular: en una app zoneless hay que pedir el refresco a mano.
   */
  private attachDismissListeners(): void {
    if (this.dismissTeardown) return;
    const onDismiss = () => this.ngZone.run(() => {
      this.closeActions();
      this.cdr.markForCheck();
    });
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('scroll', onDismiss, true);
      window.addEventListener('resize', onDismiss);
    });
    this.dismissTeardown = () => {
      document.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }

  private detachDismissListeners(): void {
    this.dismissTeardown?.();
    this.dismissTeardown = undefined;
  }

  /** Ancla el dropdown debajo del badge, o arriba si no entra en el viewport. */
  private computePosition(rect: DOMRect): { top: number; left: number } {
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_MARGIN)
    );
    const below = rect.bottom + DROPDOWN_OFFSET;
    const top = below + DROPDOWN_HEIGHT > window.innerHeight - VIEWPORT_MARGIN
      ? Math.max(VIEWPORT_MARGIN, rect.top - DROPDOWN_HEIGHT - DROPDOWN_OFFSET)
      : below;
    return { top, left };
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
