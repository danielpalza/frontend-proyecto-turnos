import { Injectable } from '@angular/core';

/**
 * Bloquea el scroll del `body` mientras haya al menos un overlay activo.
 *
 * Lleva un contador de referencias para soportar modales apilados: el scroll se libera recién
 * cuando el último overlay se cierra. Compensa el ancho de la barra de scroll con `padding-right`
 * para que el contenido no salte al ocultarse. Se maneja vía `appScrollLock`.
 */
@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private count = 0;
  private previousOverflow = '';
  private previousPaddingRight = '';

  lock(): void {
    if (this.count === 0) {
      const body = document.body;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      this.previousOverflow = body.style.overflow;
      this.previousPaddingRight = body.style.paddingRight;

      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        const currentPadding = parseFloat(getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      }
    }
    this.count++;
  }

  unlock(): void {
    if (this.count === 0) {
      return;
    }
    this.count--;
    if (this.count === 0) {
      const body = document.body;
      body.style.overflow = this.previousOverflow;
      body.style.paddingRight = this.previousPaddingRight;
    }
  }
}
