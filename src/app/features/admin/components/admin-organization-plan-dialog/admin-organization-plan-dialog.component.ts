import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationAdminDTO } from '../../admin.models';
import { PlanCatalogItem, PlanType } from '../../../../core/models';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { BodyPortalDirective } from '../../../../shared/directives/body-portal.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';

/**
 * Cambio de plan de una organización desde el panel admin, contra el catálogo real.
 *
 * <p>Antes este diálogo editaba cuatro campos de texto libre en `Organization` que no estaban
 * conectados con nada: se veía "Plan Pro / $50000" en pantalla y no afectaba ni los cupos ni la
 * facturación. Ahora aplica las mismas reglas que si la clínica cambiara el plan por su cuenta.
 */
@Component({
  selector: 'app-admin-organization-plan-dialog',
  standalone: true,
  imports: [CommonModule, BodyPortalDirective, ScrollLockDirective],
  templateUrl: './admin-organization-plan-dialog.component.html',
  styleUrls: ['./admin-organization-plan-dialog.component.scss']
})
export class AdminOrganizationPlanDialogComponent implements OnChanges {

  @Input() open = false;
  @Input() organization: OrganizationAdminDTO | null = null;
  @Input() isSaving = false;
  @Input() saveError = '';

  @Output() openChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<PlanType>();

  planes: PlanCatalogItem[] = [];
  isLoadingPlanes = false;
  loadError = '';

  seleccionado: PlanType | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.seleccionado = this.organization?.plan ?? null;
      this.loadError = '';
      this.loadPlanes();
    }
  }

  private loadPlanes(): void {
    this.isLoadingPlanes = true;
    // La app es zoneless: sin markForCheck la respuesta llega pero la vista no se repinta.
    this.subscriptionService.getPlanes().subscribe({
      next: (planes) => {
        this.planes = planes;
        this.isLoadingPlanes = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isLoadingPlanes = false;
        this.loadError = this.errorHandler.getErrorMessage(err, 'cargar los planes');
        this.cdr.markForCheck();
      }
    });
  }

  seleccionar(plan: PlanCatalogItem): void {
    if (this.isSaving) return;
    this.seleccionado = plan.codigo;
  }

  esActual(plan: PlanCatalogItem): boolean {
    return this.organization?.plan === plan.codigo;
  }

  /** Bajar de plan no aplica al instante: entra en vigencia al cerrar el período en curso. */
  get esBaja(): boolean {
    if (!this.seleccionado || !this.organization?.plan) return false;
    return this.ordenDe(this.seleccionado) < this.ordenDe(this.organization.plan);
  }

  private ordenDe(codigo: PlanType): number {
    return this.planes.find(p => p.codigo === codigo)?.orden ?? 0;
  }

  get hayCambio(): boolean {
    return this.seleccionado !== null && this.seleccionado !== this.organization?.plan;
  }

  limiteTexto(valor: number, singular: string, plural: string): string {
    // El catálogo usa 9999 como "sin tope" en lugar de un nulo, para no complicar las validaciones.
    if (valor >= 9999) return `${plural} ilimitados`;
    return `${valor} ${valor === 1 ? singular : plural}`;
  }

  close(): void {
    if (this.isSaving) return;
    this.openChange.emit(false);
  }

  handleSubmit(): void {
    if (this.isSaving || !this.hayCambio || !this.seleccionado) return;
    this.save.emit(this.seleccionado);
  }

  trackByCodigo(_: number, plan: PlanCatalogItem): string {
    return plan.codigo;
  }
}
