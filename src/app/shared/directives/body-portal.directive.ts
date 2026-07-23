import { Directive, ElementRef, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';

/**
 * Teletransporta el elemento host a `document.body` mientras vive, y lo devuelve al destruirse.
 *
 * Se usa en overlays (`.modal`, `.modal-backdrop`) que necesitan `position: fixed` relativo al
 * viewport. Cuando un ancestro aplica `zoom` o `transform` —por ejemplo el escalado de los paneles
 * de Configuraciones en `.settings-panels-scale`— ese ancestro pasa a ser el bloque contenedor de
 * sus descendientes `fixed`, y el backdrop deja de cubrir el 100% de la pantalla (queda escalado y
 * anclado al panel). Al mover el nodo al body escapa de ese contexto y vuelve a cubrir el viewport.
 *
 * ```html
 * <div class="modal" *ngIf="open" appBodyPortal>…</div>
 * ```
 */
@Directive({
  selector: '[appBodyPortal]',
  standalone: true
})
export class BodyPortalDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  ngOnInit(): void {
    this.renderer.appendChild(document.body, this.host.nativeElement);
  }

  ngOnDestroy(): void {
    // Idempotente: si Angular ya lo quitó al destruir la vista, `remove()` es un no-op.
    (this.host.nativeElement as HTMLElement).remove();
  }
}
