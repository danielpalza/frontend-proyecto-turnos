import { Injectable } from '@angular/core';

/** Propiedades que el lock toca sobre `<html>`, con su valor/prioridad previos para restaurarlas. */
interface SavedStyle {
  value: string;
  priority: string;
}

/**
 * Bloquea el scroll de la página mientras haya al menos un overlay activo.
 *
 * Actúa sobre `<html>`, que es el elemento que scrollea: `styles.scss` declara
 * `html { overflow-y: scroll !important }` y `body { overflow-y: visible !important }`, así que el
 * body nunca scrollea y hay que ganarle al `!important` desde el estilo inline (un inline sin
 * prioridad pierde contra un `!important` de hoja de estilos).
 *
 * Lleva un contador de referencias para soportar modales apilados: el scroll se libera recién
 * cuando el último overlay se cierra. Como `overflow-y: scroll` reserva la barra de forma
 * permanente, al ocultarla se compensa con `padding-right` para que el contenido no salte.
 * Se maneja vía `appScrollLock`.
 */
@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private count = 0;
  private savedOverflowY: SavedStyle = { value: '', priority: '' };
  private savedPaddingRight: SavedStyle = { value: '', priority: '' };

  lock(): void {
    if (this.count === 0) {
      const root = document.documentElement;
      const scrollbarWidth = window.innerWidth - root.clientWidth;

      this.savedOverflowY = this.save(root, 'overflow-y');
      this.savedPaddingRight = this.save(root, 'padding-right');

      root.style.setProperty('overflow-y', 'hidden', 'important');
      if (scrollbarWidth > 0) {
        const currentPadding = parseFloat(getComputedStyle(root).paddingRight) || 0;
        root.style.setProperty('padding-right', `${currentPadding + scrollbarWidth}px`, 'important');
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
      const root = document.documentElement;
      this.restore(root, 'overflow-y', this.savedOverflowY);
      this.restore(root, 'padding-right', this.savedPaddingRight);
    }
  }

  private save(element: HTMLElement, property: string): SavedStyle {
    return {
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    };
  }

  private restore(element: HTMLElement, property: string, saved: SavedStyle): void {
    if (saved.value) {
      element.style.setProperty(property, saved.value, saved.priority);
    } else {
      element.style.removeProperty(property);
    }
  }
}
