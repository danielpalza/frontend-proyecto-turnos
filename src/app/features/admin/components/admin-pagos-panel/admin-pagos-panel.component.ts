import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../admin.service';
import { OrganizationBillingDTO } from '../../admin.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { PaymentStatus, PlanType, SubscriptionPaymentRow } from '../../../../core/models';
import { ConfirmDialogComponent } from '../../../appointments/components/confirm-dialog/confirm-dialog.component';

/**
 * Cobranza cross-organización: qué clínica debe, cuánto y desde cuándo, y el botón para dar por
 * recibida la transferencia. La facturación es manual (alias + transferencia), así que este panel
 * es el único lugar donde un pago pasa a estar acreditado.
 */
@Component({
  selector: 'app-admin-pagos-panel',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './admin-pagos-panel.component.html',
  styleUrls: ['./admin-pagos-panel.component.scss']
})
export class AdminPagosPanelComponent implements OnInit {

  pagos: OrganizationBillingDTO[] = [];
  isLoading = false;

  /** Organización cuyo historial está desplegado, con sus períodos ya traídos. */
  historialAbiertoDe: string | null = null;
  historial: SubscriptionPaymentRow[] = [];
  isLoadingHistorial = false;

  confirmandoPago: OrganizationBillingDTO | null = null;
  isConfirmandoPago = false;

  private readonly planLabels: Record<PlanType, string> = {
    BASICO: 'Básico',
    MEDIO: 'Medio',
    PRO: 'Pro'
  };

  constructor(
    private adminService: AdminService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading = true;
    this.adminService.listarPagos().subscribe({
      next: (pagos) => {
        this.pagos = pagos;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isLoading = false;
        this.mostrarError(err, 'cargar el estado de pagos');
      }
    });
  }

  // --- Presentación -----------------------------------------------------------------------

  planLabel(plan: PlanType | null): string {
    return plan ? this.planLabels[plan] ?? plan : '—';
  }

  estadoLabel(pago: OrganizationBillingDTO): string {
    if (pago.estadoSuscripcion === 'CANCELADA') return 'Dada de baja';
    switch (pago.estadoPago) {
      case 'PAGADO': return 'Al día';
      case 'VENCIDO': return `Vencido ${pago.diasVencido} d`;
      case 'PENDIENTE': return 'Pendiente';
      default: return '—';
    }
  }

  estadoBadgeClass(pago: OrganizationBillingDTO): string {
    if (pago.estadoSuscripcion === 'CANCELADA') return 'badge-pago-baja';
    switch (pago.estadoPago) {
      case 'PAGADO': return 'badge-pago-pagado';
      case 'VENCIDO': return 'badge-pago-vencido';
      case 'PENDIENTE': return 'badge-pago-pendiente';
      default: return '';
    }
  }

  estadoPeriodoLabel(estado: PaymentStatus): string {
    switch (estado) {
      case 'PAGADO': return 'Pagado';
      case 'VENCIDO': return 'Vencido';
      case 'PENDIENTE': return 'Pendiente';
    }
  }

  estadoPeriodoBadgeClass(estado: PaymentStatus): string {
    switch (estado) {
      case 'PAGADO': return 'badge-pago-pagado';
      case 'VENCIDO': return 'badge-pago-vencido';
      case 'PENDIENTE': return 'badge-pago-pendiente';
    }
  }

  /** Solo se puede confirmar si hay un período impago concreto al que imputarlo. */
  puedeConfirmar(pago: OrganizationBillingDTO): boolean {
    return pago.periodoPagoId !== null;
  }

  // --- Confirmación de pago ---------------------------------------------------------------

  pedirConfirmacion(pago: OrganizationBillingDTO): void {
    this.confirmandoPago = pago;
  }

  cancelarConfirmacion(): void {
    if (this.isConfirmandoPago) return;
    this.confirmandoPago = null;
  }

  get resumenConfirmacion(): string {
    const pago = this.confirmandoPago;
    if (!pago) return '';
    const importe = pago.precio != null ? `${pago.moneda ?? ''} ${pago.precio}`.trim() : 'sin precio cargado';
    return `${pago.nombre} — plan ${this.planLabel(pago.plan)} (${importe})`;
  }

  confirmarPago(): void {
    const pago = this.confirmandoPago;
    if (!pago?.periodoPagoId || this.isConfirmandoPago) return;

    this.isConfirmandoPago = true;
    this.adminService.confirmarPago(pago.organizationId, pago.periodoPagoId).subscribe({
      next: () => {
        this.isConfirmandoPago = false;
        this.confirmandoPago = null;
        this.notification.showSuccess(`Pago de ${pago.nombre} confirmado`);
        // Confirmar un pago sincroniza el ciclo de esa organización, así que se recarga todo.
        this.load();
        if (this.historialAbiertoDe === pago.organizationId) {
          this.cargarHistorial(pago.organizationId);
        }
      },
      error: (err: unknown) => {
        this.isConfirmandoPago = false;
        this.confirmandoPago = null;
        this.mostrarError(err, 'confirmar el pago');
      }
    });
  }

  // --- Historial --------------------------------------------------------------------------

  toggleHistorial(pago: OrganizationBillingDTO): void {
    if (this.historialAbiertoDe === pago.organizationId) {
      this.historialAbiertoDe = null;
      this.historial = [];
      return;
    }
    this.historialAbiertoDe = pago.organizationId;
    this.cargarHistorial(pago.organizationId);
  }

  private cargarHistorial(orgId: string): void {
    this.isLoadingHistorial = true;
    this.historial = [];
    this.adminService.listarPagosDeOrganizacion(orgId).subscribe({
      next: (filas) => {
        this.historial = filas;
        this.isLoadingHistorial = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isLoadingHistorial = false;
        this.mostrarError(err, 'cargar el historial de pagos');
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

  trackByOrg(_: number, pago: OrganizationBillingDTO): string {
    return pago.organizationId;
  }

  trackByPeriodo(_: number, fila: SubscriptionPaymentRow): string {
    return fila.id;
  }
}
