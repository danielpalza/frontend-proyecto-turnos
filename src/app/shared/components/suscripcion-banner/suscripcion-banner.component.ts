import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription as RxSubscription } from 'rxjs';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Subscription } from '../../../core/models';

/**
 * Aviso persistente de suscripción impaga, montado en el shell para que se vea en toda la app.
 *
 * <p>Dos tonos: advertencia mientras quedan días de gracia, y error una vez que la organización
 * pasó a solo lectura. La fecha de corte la calcula el backend y viaja en el DTO, así que acá no
 * se duplica ninguna regla de negocio.
 */
@Component({
  selector: 'app-suscripcion-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './suscripcion-banner.component.html',
  styleUrls: ['./suscripcion-banner.component.scss']
})
export class SuscripcionBannerComponent implements OnInit, OnDestroy {

  subscription: Subscription | null = null;
  dismissed = false;

  private subscriptions = new RxSubscription();

  constructor(
    private subscriptionService: SubscriptionService,
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

  get visible(): boolean {
    if (!this.subscription || this.subscription.estadoPago !== 'VENCIDO') return false;
    // En solo lectura no se puede ocultar: el usuario necesita saber por qué no puede guardar nada.
    return this.esSoloLectura || !this.dismissed;
  }

  get esSoloLectura(): boolean {
    return !!this.subscription?.soloLectura;
  }

  get fechaCorte(): string | null {
    return this.subscription?.fechaSoloLectura ?? null;
  }

  dismiss(): void {
    this.dismissed = true;
  }
}
