import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '../services/error-handler.service';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
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
  const authService = inject(AuthService);
  const router = inject(Router);
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // No redirigir a login para endpoints de autenticación (login, register, verify, forgot-password, reset-password)
      const isAuthEndpoint = req.url.includes('/auth/');
      const skipGlobalHandler = req.context.get(SKIP_GLOBAL_ERROR_HANDLER);

      if (error.status === 403 && !isAuthEndpoint) {
        if (!skipGlobalHandler) {
          handleCapabilityForbidden(error, authService, notification, router);
        }
        return throwError(() => error);
      }

      if (error.status === 401 && !isAuthEndpoint) {
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // 402: la organización quedó en solo lectura por falta de pago. No es un problema de permisos
      // ni de sesión, así que no se cierra nada — se avisa y se refresca el estado para que el
      // banner y el panel de Configuraciones queden al día.
      if (error.status === 402 && !isAuthEndpoint) {
        const message: string = error.error?.message
          || 'Tu suscripción está impaga. Regularizá el pago para volver a cargar datos.';
        notification.showError(message);
        // Se resuelve acá y no arriba: SubscriptionService depende de HttpClient, y pedirlo al
        // construir el interceptor cerraría el ciclo HttpClient → interceptor → HttpClient.
        injector.get(SubscriptionService).loadSubscription().subscribe();
        return throwError(() => error);
      }

      // Para endpoints de auth, SIEMPRE propagar el error al componente
      if (isAuthEndpoint) {
        return throwError(() => error);
      }

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
        
        // Mostrar notificación para errores, excepto:
        // - 401/403 que se manejan desde el backend
        // - errores de red (sin conexión), que se mostrarán solo en los componentes
        if (!errorHandler.isNetworkError(error)) {
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
  // 401 ya se maneja arriba (redirect a login), no necesita manejo global
  // 403 SÍ se maneja acá abajo (mensaje de "sin permiso", sin cerrar la sesión)
  // 404 se maneja desde el backend con mensajes personalizados
  if (error.status === 401 || error.status === 404) {
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
    if (url.includes('/identificacion')) {
      return 'buscar paciente por documento';
    }
    return 'gestionar el paciente';
  }

  if (url.includes('/profesionales')) {
    return 'gestionar el profesional';
  }

  return 'realizar la operación';
}

/**
 * Un 403 tiene causas distintas que desde afuera se ven igual, y merecen respuestas opuestas.
 *
 * Si el frontend **cree** que tiene la capacidad que el backend rechazó, la sesión quedó
 * desactualizada: las capacidades viajan en el login y se cachean en `localStorage` con un JWT de
 * 24 h sin refresh, así que un cambio de módulos no se refleja hasta volver a entrar. Ahí sí hay que
 * forzar el re-login, avisando por qué.
 *
 * Si el frontend ya sabía que no la tiene, el usuario llegó por una URL directa o un botón que
 * todavía no declara su capacidad: alcanza con avisarle. Echarlo a login sería desproporcionado.
 *
 * Un 403 sin `requiredCapability` no es ninguno de los dos casos anteriores — no hay capacidad
 * involucrada (rol incorrecto en `AdminController`, o una baranda de `ModuleGrantGuard`/`AdminGuard`,
 * que viajan como `ForbiddenException` planas). Tratarlo como sesión vencida forzaba logout de
 * cualquiera que pisara una baranda de autoescalada o entrara al panel superadmin sin ser ADMIN, en
 * vez de mostrarle el mensaje del backend.
 */
function handleCapabilityForbidden(
  error: HttpErrorResponse,
  authService: AuthService,
  notification: NotificationService,
  router: Router
): void {
  const requiredCapability: string | undefined = error.error?.requiredCapability;
  const message: string = error.error?.message || 'No tenés permiso para realizar esta acción';

  // Sin el campo no hay capacidad que pueda estar desactualizada: no es sesión vencida, es un 403
  // de otro tipo (rol incorrecto de AdminController, o una baranda de ModuleGrantGuard/AdminGuard).
  // Antes cualquier 403 sin el campo forzaba logout — cerraba la sesión de quien pisaba una baranda
  // de autoescalada o el panel superadmin, en vez de mostrarle el mensaje.
  const sesionDesactualizada =
    !!requiredCapability && authService.hasCapability(requiredCapability);

  if (sesionDesactualizada) {
    notification.showError('Tus permisos cambiaron. Iniciá sesión de nuevo para continuar.');
    authService.logout();
    router.navigate(['/login']);
    return;
  }

  notification.showError(message);
}

