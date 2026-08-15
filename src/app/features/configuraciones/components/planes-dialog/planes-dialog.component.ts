import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { PlanCatalogItem, PlanType, Subscription } from '../../../../core/models';
import { BodyPortalDirective } from '../../../../shared/directives/body-portal.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';

/** Cómo se compara el plan de la tarjeta contra el vigente. */
type PlanRelacion = 'actual' | 'mejora' | 'baja';

@Component({
  selector: 'app-planes-dialog',
  standalone: true,
  imports: [CommonModule, BodyPortalDirective, ScrollLockDirective],
  templateUrl: './planes-dialog.component.html',
  styleUrls: ['./planes-dialog.component.scss']
})
export class PlanesDialogComponent implements OnChanges {

  @Input() open = false;
  @Input() subscription: Subscription | null = null;
  @Output() closed = new EventEmitter<void>();

  planes: PlanCatalogItem[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  /** Plan elegido a la baja, esperando confirmación explícita del usuario. */
  bajaPendienteDeConfirmar: PlanCatalogItem | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.errorMessage = '';
      this.bajaPendienteDeConfirmar = null;
      this.loadPlanes();
    }
  }

  private loadPlanes(): void {
    this.isLoading = true;
    // La app es zoneless: sin markForCheck la respuesta llega pero la vista no se repinta.
    this.subscriptionService.getPlanes().subscribe({
      next: (planes) => {
        this.planes = planes;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isLoading = false;
        this.errorMessage = this.errorHandler.getErrorMessage(err, 'cargar los planes');
        this.cdr.markForCheck();
      }
    });
  }

  close(): void {
    if (this.isSaving) return;
    this.closed.emit();
  }

  relacionCon(plan: PlanCatalogItem): PlanRelacion {
    if (!this.subscription) return 'mejora';
    if (plan.codigo === this.subscription.plan) return 'actual';
    return this.ordenDe(plan.codigo) > this.ordenDe(this.subscription.plan) ? 'mejora' : 'baja';
  }

  private ordenDe(codigo: PlanType): number {
    return this.planes.find(p => p.codigo === codigo)?.orden ?? 0;
  }

  /** El plan que ya está agendado para entrar en vigencia al cerrar el período. */
  esBajaAgendada(plan: PlanCatalogItem): boolean {
    return this.subscription?.planPendiente === plan.codigo;
  }

  onElegir(plan: PlanCatalogItem): void {
    const relacion = this.relacionCon(plan);
    if (relacion === 'actual' || this.isSaving) return;

    // Bajar de plan recién se aplica el próximo período: conviene que quede explícito antes.
    if (relacion === 'baja') {
      this.bajaPendienteDeConfirmar = plan;
      return;
    }
    this.aplicar(plan.codigo);
  }

  confirmarBaja(): void {
    if (!this.bajaPendienteDeConfirmar) return;
    this.aplicar(this.bajaPendienteDeConfirmar.codigo);
  }

  cancelarBaja(): void {
    this.bajaPendienteDeConfirmar = null;
  }

  private aplicar(plan: PlanType): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.subscriptionService.changePlan(plan).subscribe({
      next: () => {
        this.isSaving = false;
        this.bajaPendienteDeConfirmar = null;
        this.cdr.markForCheck();
        this.closed.emit();
      },
      error: (err: unknown) => {
        this.isSaving = false;
        this.bajaPendienteDeConfirmar = null;
        this.errorMessage = this.errorHandler.getErrorMessage(err, 'cambiar el plan');
        this.cdr.markForCheck();
      }
    });
  }

  /** Texto del botón según lo que implique el cambio. */
  accionDe(plan: PlanCatalogItem): string {
    switch (this.relacionCon(plan)) {
      case 'actual': return 'Tu plan actual';
      case 'mejora': return 'Mejorar a este plan';
      case 'baja': return 'Bajar a este plan';
    }
  }

  limiteTexto(valor: number, singular: string, plural: string): string {
    // El catálogo usa 9999 como "sin tope" en lugar de un nulo, para no complicar las validaciones.
    if (valor >= 9999) return `${plural} ilimitados`;
    return `${valor} ${valor === 1 ? singular : plural}`;
  }

  get fechaEfecto(): string | null {
    return this.subscription?.fechaVencimiento ?? null;
  }

  trackByCodigo(_: number, plan: PlanCatalogItem): string {
    return plan.codigo;
  }
}
