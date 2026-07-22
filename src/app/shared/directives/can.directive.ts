import {
  DestroyRef,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { capabilityDeniedMessage } from '../../core/auth/capabilities';

/** Elementos que aceptan el atributo `disabled` de forma nativa. */
const DISABLEABLE = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'FIELDSET', 'OPTGROUP', 'OPTION']);

/**
 * Deshabilita el control si al usuario le falta la capacidad, y explica por qué en el tooltip.
 *
 * Se usa para controles dentro de una pantalla ya visible: el nodo permanece en el DOM (los specs de
 * Playwright pueden asertarlo en estado `disabled`) y el usuario entiende que existe pero no lo tiene
 * habilitado. Para navegación usar `*appCanShow`. Ver `docs/PERMISOS.md § 6.5`.
 *
 * ```html
 * <button [appCan]="'SEGUIMIENTO:VIEW'" (click)="goToSeguimiento()">Ver detalle</button>
 * ```
 */
@Directive({
  selector: '[appCan]',
  standalone: true
})
export class CanDirective implements OnInit, OnChanges {
  @Input({ required: true }) appCan!: string;

  private readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.apply());
  }

  ngOnChanges(): void {
    this.apply();
  }

  private apply(): void {
    const element = this.host.nativeElement as HTMLElement;
    const allowed = this.auth.hasCapability(this.appCan);

    if (allowed) {
      this.renderer.removeClass(element, 'capability-locked');
      this.renderer.removeAttribute(element, 'aria-disabled');
      if (DISABLEABLE.has(element.tagName)) {
        this.renderer.removeAttribute(element, 'disabled');
      }
      if (element.getAttribute('title') === capabilityDeniedMessage(this.appCan)) {
        this.renderer.removeAttribute(element, 'title');
      }
      return;
    }

    this.renderer.addClass(element, 'capability-locked');
    this.renderer.setAttribute(element, 'aria-disabled', 'true');
    this.renderer.setAttribute(element, 'title', capabilityDeniedMessage(this.appCan));
    if (DISABLEABLE.has(element.tagName)) {
      this.renderer.setAttribute(element, 'disabled', 'true');
    }
  }
}

/**
 * Renderiza el contenido solo si el usuario tiene la capacidad. Para navegación (pestañas, ítems de
 * menú), donde un control gris no aporta nada.
 *
 * ```html
 * <a *appCanShow="'COBERTURA:VIEW'" routerLink="/coberturas">Cobertura</a>
 * ```
 */
@Directive({
  selector: '[appCanShow]',
  standalone: true
})
export class CanShowDirective implements OnInit, OnChanges {
  @Input({ required: true }) appCanShow!: string;

  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private rendered = false;

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.apply());
  }

  ngOnChanges(): void {
    this.apply();
  }

  private apply(): void {
    const allowed = this.auth.hasCapability(this.appCanShow);

    if (allowed && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = true;
    } else if (!allowed && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
