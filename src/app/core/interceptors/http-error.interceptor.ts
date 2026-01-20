import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '../services/error-handler.service';
import { NotificationService } from '../services/notification.service';
import { SKIP_GLOBAL_ERROR_HANDLER } from './http-context';

/**
 * Interceptor HTTP para manejar errores globalmente
 * 
 * Este interceptor captura todos los errores HTTP y:
 * - Muestra notificaciones para errores no críticos
 * - Loggea errores para debugging
 * - Permite que errores específicos sean manejados por los componentes
 * - Respeta el contexto SKIP_GLOBAL_ERROR_HANDLER para evitar notificaciones duplicadas
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandlerService);
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Verificar si el componente quiere manejar el error específicamente
      const skipGlobalHandler = req.context.get(SKIP_GLOBAL_ERROR_HANDLER);
      
      // Si el componente maneja el error, solo loguear y re-lanzar
      if (skipGlobalHandler) {
        console.log(`[HTTP Error] Error manejado específicamente por componente: ${req.method} ${req.url}`);
        return throwError(() => error);
      }

      // Determinar si el error debe ser manejado globalmente o por el componente
      const shouldHandleGlobally = shouldHandleErrorGlobally(req.url, error);

      if (shouldHandleGlobally) {
        // Extraer contexto de la URL
        const context = extractContextFromUrl(req.url);
        const message = errorHandler.getErrorMessage(error, context);
        
        // Mostrar notificación para errores, excepto 401/403 que se manejan desde el backend
        // Los errores 401/403 se manejan específicamente desde el backend con mensajes personalizados
        if (error.status !== 401 && error.status !== 403) {
          notification.showError(message);
        }

        // Log para debugging
        console.error(`[HTTP Error] ${req.method} ${req.url}:`, error);
      }

      // Re-lanzar el error para que los componentes puedan manejarlo si lo necesitan
      return throwError(() => error);
    })
  );
};

/**
 * Determina si un error debe ser manejado globalmente
 * Algunos errores son manejados específicamente por componentes o por el backend
 */
function shouldHandleErrorGlobally(url: string, error: HttpErrorResponse): boolean {
  // No manejar errores 401/403/404 globalmente - se manejan desde el backend
  // El backend devuelve mensajes personalizados en el body de la respuesta
  if (error.status === 401 || error.status === 403 || error.status === 404) {
    return false;
  }

  // Manejar todos los demás errores globalmente
  return true;
}

/**
 * Extrae el contexto de la acción desde la URL
 */
function extractContextFromUrl(url: string): string {
  if (url.includes('/appointments')) {
    if (url.includes('/addPayment')) {
      return 'agregar el pago';
    }
    if (url.includes('/status')) {
      return 'actualizar el estado del turno';
    }
    // Detectar si es el endpoint principal (GET /api/appointments) o endpoints de consulta
    if (url.match(/\/appointments\/?$/) || url.includes('/date') || url.includes('/range') || url.includes('/count') || url.includes('/patient/')) {
      return 'cargar los turnos';
    }
    // Para otros endpoints de appointments (POST, PATCH, DELETE)
    if (url.match(/\/appointments\/\d+$/)) {
      return 'gestionar el turno';
    }
    return 'gestionar los turnos';
  }

  if (url.includes('/patients')) {
    if (url.includes('/search')) {
      return 'buscar pacientes';
    }
    if (url.includes('/dni')) {
      return 'buscar paciente por DNI';
    }
    return 'gestionar el paciente';
  }

  if (url.includes('/profesionales')) {
    return 'gestionar el profesional';
  }

  return 'realizar la operación';
}

