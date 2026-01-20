import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Token de contexto HTTP para indicar que el error debe ser manejado específicamente
 * por el componente y no por el interceptor global.
 * 
 * Uso:
 * ```typescript
 * this.http.get(url, {
 *   context: SKIP_GLOBAL_ERROR_HANDLER.set(true)
 * })
 * ```
 */
export const SKIP_GLOBAL_ERROR_HANDLER = new HttpContextToken<boolean>(() => false);

/**
 * Helper para crear un contexto HTTP que indica que el error debe ser manejado específicamente
 * 
 * @returns HttpContext configurado para saltar el manejo global de errores
 */
export function skipGlobalErrorHandler(): HttpContext {
  return new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLER, true);
}

