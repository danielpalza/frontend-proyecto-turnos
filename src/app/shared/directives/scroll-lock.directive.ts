import { Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { ScrollLockService } from '../../core/services/scroll-lock.service';

/**
 * Bloquea el scroll de la página mientras el elemento host esté en el DOM.
 *
 * Se aplica a la raíz de un overlay que se muestra/oculta con `*ngIf`/`@if`: mientras el modal
 * está abierto el `body` no puede scrollear; al cerrarse se libera. Delega en `ScrollLockService`,
 * que cuenta referencias para soportar modales apilados.
 *
 * ```html
 * <div class="modal" *ngIf="open" appScrollLock>…</div>
 * ```
 */
@Directive({
  selector: '[appScrollLock]',
  standalone: true
})
export class ScrollLockDirective implements OnInit, OnDestroy {
  private readonly scrollLock = inject(ScrollLockService);

  ngOnInit(): void {
    this.scrollLock.lock();
  }

  ngOnDestroy(): void {
    this.scrollLock.unlock();
  }
}
