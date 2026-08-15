import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription as RxSubscription } from 'rxjs';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { PlanType, Subscription, SubscriptionPaymentRow } from '../../../../core/models';
import { Capability } from '../../../../core/auth/capabilities';
import { CanDirective } from '../../../../shared/directives/can.directive';
import { PlanesDialogComponent } from '../planes-dialog/planes-dialog.component';
import { ConfirmDialogComponent } from '../../../appointments/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-suscripcion-panel',
  standalone: true,
  imports: [CommonModule, CanDirective, PlanesDialogComponent, ConfirmDialogComponent],
  templateUrl: './suscripcion-panel.component.html',
  styleUrls: ['./suscripcion-panel.component.scss']
})
export class SuscripcionPanelComponent implements OnInit, OnDestroy {

  readonly Capability = Capability;

  subscription: Subscription | null = null;

  showPlanesDialog = false;

  historialAbierto = false;
  historial: SubscriptionPaymentRow[] = [];
  isLoadingHistorial = false;
  historialCargado = false;

  aliasCopied = false;
  isCancelandoCambio = false;

  /** Confirmación de la baja de la suscripción entera (no confundir con la baja de plan). */
  showCancelarSuscripcion = false;
  isCancelandoSuscripcion = false;

  private readonly planLabels: Record<PlanType, string> = {
    BASICO: 'Básico',
    MEDIO: 'Medio',
    PRO: 'Pro'
  };

  private subscriptions = new RxSubscription();

  constructor(
    private subscriptionService: SubscriptionService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.subscriptionService.getSubscription().subscribe({
        next: (sub) => {
          this.subscription = sub;
          this.cdr.markForCheck();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // --- Plan -------------------------------------------------------------------------------

  get planLabel(): string {
    return this.subscription ? this.planLabels[this.subscription.plan] : '';
  }

  get planPendienteLabel(): string {
    const pendiente = this.subscription?.planPendiente;
    return pendiente ? this.planLabels[pendiente] : '';
  }

  get tieneCambioAgendado(): boolean {
    return !!this.subscription?.planPendiente;
  }

  openPlanesDialog(): void {
    this.showPlanesDialog = true;
  }

  onPlanesDialogClosed(): void {
    this.showPlanesDialog = false;
    // El modal también se cierra solo tras aplicar un cambio, es decir desde un callback async.
    this.cdr.markForCheck();
  }

  cancelarCambioPendiente(): void {
    if (this.isCancelandoCambio) return;
    this.isCancelandoCambio = true;

    this.subscriptionService.cancelarCambioPendiente().subscribe({
      next: () => {
        this.isCancelandoCambio = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isCancelandoCambio = false;
        const message = this.errorHandler.getErrorMessage(err, 'cancelar el cambio de plan');
        if (!this.errorHandler.isNetworkError(err as any)) {
          this.notification.showError(message);
        }
        this.cdr.markForCheck();
      }
    });
  }

  // --- Baja de la suscripción -------------------------------------------------------------

  get estaDadaDeBaja(): boolean {
    return this.subscription?.estadoSuscripcion === 'CANCELADA';
  }

  get tieneBajaAgendada(): boolean {
    return !this.estaDadaDeBaja && !!this.subscription?.cancelacionDesde;
  }

  /** El corte no es inmediato: conviene que la fecha exacta esté en la confirmación. */
  get mensajeConfirmacionBaja(): string {
    const hasta = this.subscription?.fechaVencimiento;
    if (!hasta) {
      return 'Tu suscripción se dará de baja al cerrar el período de facturación en curso.';
    }
    const fecha = new Date(hasta).toLocaleDateString('es-AR');
    return `Vas a seguir con tu plan ${this.planLabel} y todos sus beneficios hasta el ${fecha}, `
      + 'que es el período que ya tenés pago. A partir de esa fecha vas a poder consultar tu '
      + 'información pero no cargar datos nuevos.';
  }

  pedirCancelarSuscripcion(): void {
    this.showCancelarSuscripcion = true;
  }

  cerrarCancelarSuscripcion(): void {
    if (this.isCancelandoSuscripcion) return;
    this.showCancelarSuscripcion = false;
  }

  confirmarCancelarSuscripcion(): void {
    if (this.isCancelandoSuscripcion) return;
    this.isCancelandoSuscripcion = true;

    this.subscriptionService.cancelarSuscripcion().subscribe({
      next: () => {
        this.isCancelandoSuscripcion = false;
        this.showCancelarSuscripcion = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isCancelandoSuscripcion = false;
        this.showCancelarSuscripcion = false;
        this.mostrarError(err, 'dar de baja la suscripción');
      }
    });
  }

  /** Deshace la baja agendada, antes de que se haga efectiva. */
  revertirCancelacion(): void {
    if (this.isCancelandoSuscripcion) return;
    this.isCancelandoSuscripcion = true;

    this.subscriptionService.revertirCancelacion().subscribe({
      next: () => {
        this.isCancelandoSuscripcion = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isCancelandoSuscripcion = false;
        this.mostrarError(err, 'reactivar la suscripción');
      }
    });
  }

  private mostrarError(err: unknown, accion: string): void {
    const message = this.errorHandler.getErrorMessage(err, accion);
    if (!this.errorHandler.isNetworkError(err as any)) {
      this.notification.showError(message);
    }
    this.cdr.markForCheck();
  }

  // --- Estado de pago ---------------------------------------------------------------------

  get estadoPagoLabel(): string {
    switch (this.subscription?.estadoPago) {
      case 'PAGADO': return 'Pago al día';
      case 'VENCIDO': return 'Pago vencido';
      case 'PENDIENTE': return 'Pago pendiente';
      default: return '';
    }
  }

  get estadoPagoBadgeClass(): string {
    switch (this.subscription?.estadoPago) {
      case 'PAGADO': return 'badge-pago-pagado';
      case 'VENCIDO': return 'badge-pago-vencido';
      case 'PENDIENTE': return 'badge-pago-pendiente';
      default: return '';
    }
  }

  estadoPeriodoLabel(estado: SubscriptionPaymentRow['estado']): string {
    switch (estado) {
      case 'PAGADO': return 'Pagado';
      case 'VENCIDO': return 'Vencido';
      case 'PENDIENTE': return 'Pendiente';
    }
  }

  estadoPeriodoBadgeClass(estado: SubscriptionPaymentRow['estado']): string {
    switch (estado) {
      case 'PAGADO': return 'badge-pago-pagado';
      case 'VENCIDO': return 'badge-pago-vencido';
      case 'PENDIENTE': return 'badge-pago-pendiente';
    }
  }

  // --- Cupos ------------------------------------------------------------------------------

  porcentaje(actual: number, max: number): number {
    if (!max) return 0;
    return Math.min(100, (actual / max) * 100);
  }

  /** Colorea la barra al acercarse al tope, para que el límite se vea antes de chocarlo. */
  usoClase(actual: number, max: number): string {
    const pct = this.porcentaje(actual, max);
    if (pct >= 100) return 'uso-completo';
    if (pct >= 80) return 'uso-alto';
    return '';
  }

  /** El catálogo usa 9999 como "sin tope"; mostrarlo como número confunde. */
  maxLabel(max: number): string {
    return max >= 9999 ? '∞' : `${max}`;
  }

  // --- Alias ------------------------------------------------------------------------------

  /** El alias se muestra y se copia siempre en mayúscula. */
  get aliasEnMayuscula(): string {
    return (this.subscription?.paymentAlias ?? '').toUpperCase();
  }

  copyPaymentAlias(): void {
    const alias = this.aliasEnMayuscula;
    if (!alias) return;

    navigator.clipboard.writeText(alias).then(() => {
      this.aliasCopied = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.aliasCopied = false;
        this.cdr.markForCheck();
      }, 3000);
    });
  }

  // --- Historial --------------------------------------------------------------------------

  toggleHistorial(): void {
    this.historialAbierto = !this.historialAbierto;
    if (this.historialAbierto && !this.historialCargado) {
      this.loadHistorial();
    }
  }

  private loadHistorial(): void {
    this.isLoadingHistorial = true;
    this.subscriptionService.getHistorialPagos().subscribe({
      next: (filas) => {
        this.historial = filas;
        this.historialCargado = true;
        this.isLoadingHistorial = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isLoadingHistorial = false;
        const message = this.errorHandler.getErrorMessage(err, 'cargar el historial de pagos');
        if (!this.errorHandler.isNetworkError(err as any)) {
          this.notification.showError(message);
        }
        this.cdr.markForCheck();
      }
    });
  }

  planLabelDe(plan: PlanType): string {
    return this.planLabels[plan] ?? plan;
  }

  trackByPeriodo(_: number, fila: SubscriptionPaymentRow): string {
    return fila.id;
  }
}
