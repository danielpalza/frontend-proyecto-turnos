import { Injectable } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  duration?: number; // Duración en milisegundos (default: 5000)
  dismissible?: boolean; // Si se puede cerrar manualmente (default: true)
}

/**
 * Servicio para mostrar notificaciones al usuario usando Bootstrap Toast
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastContainer: HTMLElement | null = null;

  constructor() {
    this.initializeToastContainer();
  }

  /**
   * Inicializa el contenedor de toasts si no existe
   */
  private initializeToastContainer(): void {
    if (typeof document === 'undefined') {
      return;
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createToastContainer());
    } else {
      this.createToastContainer();
    }
  }

  /**
   * Crea el contenedor de toasts
   */
  private createToastContainer(): void {
    this.toastContainer = document.getElementById('toast-container');
    
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
      
      // Asegurar que el contenedor sea visible
      this.toastContainer.style.zIndex = '9999';
      this.toastContainer.style.display = 'flex';
      this.toastContainer.style.flexDirection = 'column';
      this.toastContainer.style.alignItems = 'center';
      this.toastContainer.style.pointerEvents = 'none'; // Permitir clicks a través del contenedor
      
      // Asegurar que los toasts dentro puedan recibir clicks
      this.toastContainer.style.width = '100%';
      this.toastContainer.style.maxWidth = '500px';
      
      document.body.appendChild(this.toastContainer);
      
      // console.log('Toast container creado:', this.toastContainer); //
    }
  }

  /**
   * Muestra una notificación de éxito
   */
  showSuccess(message: string, options?: NotificationOptions): void {
    this.show(message, 'success', options);
  }

  /**
   * Muestra una notificación de error
   */
  showError(message: string, options?: NotificationOptions): void {
    console.log('[NotificationService] Mostrando error:', message);
    this.show(message, 'error', options);
  }

  /**
   * Muestra una notificación de advertencia
   */
  showWarning(message: string, options?: NotificationOptions): void {
    this.show(message, 'warning', options);
  }

  /**
   * Muestra una notificación informativa
   */
  showInfo(message: string, options?: NotificationOptions): void {
    this.show(message, 'info', options);
  }

  /**
   * Muestra una notificación genérica
   */
  private show(message: string, type: NotificationType, options?: NotificationOptions): void {
    // Asegurar que el contenedor esté inicializado
    if (typeof document !== 'undefined' && !this.toastContainer) {
      this.createToastContainer();
    }

    if (typeof document === 'undefined' || !this.toastContainer) {
      // Fallback a console si no hay DOM disponible
      console[type === 'error' ? 'error' : 'log'](`[${type.toUpperCase()}] ${message}`);
      return;
    }

    // console.log('[NotificationService] Contenedor encontrado, creando toast...', {
    //   container: this.toastContainer,
    //   message,
    //   type
    // });

    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options?.duration ?? 5000;
    const dismissible = options?.dismissible !== false;

    // Mapear tipos a clases de Bootstrap
    const bgClass = this.getBackgroundClass(type);
    const icon = this.getIcon(type);

    const toastHtml = `
      <div id="${toastId}" class="toast ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true" style="pointer-events: auto; min-width: 300px; max-width: 500px; width: 100%; margin-bottom: 0.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); border-radius: 8px; overflow: hidden;">
        <div class="toast-header ${bgClass} text-white" style="border-bottom: 1px solid rgba(255, 255, 255, 0.2); font-weight: 600; display: flex; align-items: center; padding: 0.5rem 1rem;">
          <i class="${icon} me-2"></i>
          <strong class="me-auto">${this.getTitle(type)}</strong>
          ${dismissible ? `<button type="button" class="btn-close btn-close-white" aria-label="Close" style="filter: invert(1); cursor: pointer;" onclick="this.closest('.toast').remove()"></button>` : ''}
        </div>
        <div class="toast-body" style="padding: 0.75rem 1rem; line-height: 1.5;">
          ${this.escapeHtml(message)}
        </div>
      </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = toastHtml.trim();
    const toastElement = tempDiv.firstChild as HTMLElement;

    if (!toastElement) {
      console.error('Error: No se pudo crear el elemento toast');
      return;
    }

    // Asegurar que el elemento sea visible desde el inicio
    toastElement.style.display = 'block';
    toastElement.style.visibility = 'visible';
    toastElement.style.opacity = '0';
    toastElement.style.transform = 'translateY(-20px)';
    toastElement.style.transition = 'opacity 0.3s ease-in, transform 0.3s ease-in';

    this.toastContainer.appendChild(toastElement);

    // Forzar reflow para que la animación funcione
    toastElement.offsetHeight;

    // Mostrar con animación (siempre usar CSS, no depender de Bootstrap JS)
    setTimeout(() => {
      toastElement.style.opacity = '1';
      toastElement.style.transform = 'translateY(0)';
    }, 10);

    // Intentar usar Bootstrap 5 Toast API si está disponible (opcional)
    try {
      if (typeof (window as any).bootstrap !== 'undefined' && (window as any).bootstrap.Toast) {
        const bsToast = new (window as any).bootstrap.Toast(toastElement, {
          autohide: duration > 0,
          delay: duration
        });
        bsToast.show();

        // Remover el elemento del DOM cuando se oculte
        toastElement.addEventListener('hidden.bs.toast', () => {
          this.removeToastElement(toastElement);
        });
      } else {
        // Fallback: usar solo CSS (no requiere Bootstrap JS)
        if (duration > 0) {
          setTimeout(() => {
            this.removeToastElement(toastElement);
          }, duration);
        }
      }
    } catch (error) {
      console.warn('Error initializing Bootstrap toast, usando fallback CSS:', error);
      // Fallback: usar solo CSS
      if (duration > 0) {
        setTimeout(() => {
          this.removeToastElement(toastElement);
        }, duration);
      }
    }
  }

  /**
   * Obtiene la clase de fondo según el tipo
   */
  private getBackgroundClass(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'bg-success';
      case 'error':
        return 'bg-danger';
      case 'warning':
        return 'bg-warning';
      case 'info':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Obtiene el ícono según el tipo
   */
  private getIcon(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'bi bi-check-circle-fill';
      case 'error':
        return 'bi bi-exclamation-triangle-fill';
      case 'warning':
        return 'bi bi-exclamation-circle-fill';
      case 'info':
        return 'bi bi-info-circle-fill';
      default:
        return 'bi bi-bell-fill';
    }
  }

  /**
   * Obtiene el título según el tipo
   */
  private getTitle(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'Éxito';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      case 'info':
        return 'Información';
      default:
        return 'Notificación';
    }
  }

  /**
   * Remueve un elemento toast con animación
   */
  private removeToastElement(element: HTMLElement): void {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      if (element.parentNode) {
        element.remove();
      }
    }, 300);
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

