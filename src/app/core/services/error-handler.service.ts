import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Servicio para manejar y mapear errores HTTP para el usuario
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  
  /**
   * Obtiene un mensaje de error amigable basado en el código HTTP y el contexto
   * @param error - El error HTTP recibido
   * @param context - Contexto de la acción (ej: "cargar los turnos", "crear el paciente")
   * @returns Mensaje de error formateado para mostrar al usuario
   */
  getErrorMessage(error: any, context: string): string {
    // Error de red (sin conexión)
    if (!error || !error.status || error.status === 0) {
      return this.getNetworkErrorMessage(context);
    }

    // Error HTTP con código de estado
    const status = error.status;
    const errorResponse = error.error;

    // Intentar extraer mensaje del backend si está disponible
    const backendMessage = this.extractBackendMessage(errorResponse);

    switch (status) {
      // case 400:
      //   return backendMessage || `Error al ${context}. Los datos recibidos no son válidos.`;
      
      case 401:
        return 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
      
      case 403:
        return `No tiene permisos para ${context}.`;
      
      case 404:
        if (context.includes('eliminar')) {
          return 'El turno que intenta eliminar no existe o ya fue eliminado.';
        }
        return backendMessage || `No se encontró el servicio. Contacte al administrador.`;
      
      case 408:
        return 'La solicitud tardó demasiado tiempo. Por favor, intente nuevamente.';
      
      case 409:
        return this.getConflictMessage(backendMessage, context);
      
      case 422:
        return backendMessage || `Los datos no son válidos. Verifique la información ingresada.`;
      
      case 500:
        return 'Error interno del servidor. Por favor, intente más tarde.';
      
      case 502:
        return 'El servidor no está disponible temporalmente. Intente nuevamente en unos momentos.';
      
      case 503:
        return 'El servicio no está disponible en este momento. Intente más tarde.';
      
      case 504:
        return 'El servidor tardó demasiado en responder. Por favor, intente nuevamente.';
      
      default:
        return backendMessage || `Ocurrió un error inesperado al ${context}. Por favor, intente nuevamente.`;
    }
  }

  /**
   * Obtiene mensaje específico para errores de conflicto (409)
   */
  private getConflictMessage(backendMessage: string | null, context: string): string {
    if (backendMessage) {
      return backendMessage;
    }

    if (context.includes('paciente') || context.includes('crear el paciente')) {
      return 'Ya existe un paciente con este DNI. Por favor, verifique el número de documento.';
    }

    if (context.includes('turno') || context.includes('crear el turno')) {
      return 'El horario seleccionado ya está ocupado. Por favor, elija otro horario.';
    }

    return `Error de conflicto al ${context}. Por favor, verifique los datos e intente nuevamente.`;
  }

  /**
   * Obtiene mensaje para errores de red
   */
  private getNetworkErrorMessage(context: string): string {
    if (context.includes('crear el paciente')) {
      return 'No se pudo crear el paciente. Verifique su conexión e intente nuevamente.';
    }
    if (context.includes('crear el turno')) {
      return 'No se pudo crear el turno. Verifique su conexión e intente nuevamente.';
    }
    if (context.includes('eliminar')) {
      return 'No se pudo eliminar el turno. Verifique su conexión e intente nuevamente.';
    }
    return 'Verifique su conexión a internet e intente nuevamente.';
  }

  /**
   * Extrae el mensaje de error del response del backend
   */
  private extractBackendMessage(errorResponse: any): string | null {
    if (!errorResponse) {
      return null;
    }

    // El backend devuelve: { message: "...", error: "...", status: ... }
    if (typeof errorResponse === 'string') {
      return errorResponse;
    }

    if (errorResponse.message) {
      return errorResponse.message;
    }

    if (errorResponse.error && typeof errorResponse.error === 'string') {
      return errorResponse.error;
    }

    // Si hay errores de validación, formatearlos
    if (errorResponse.errors && typeof errorResponse.errors === 'object') {
      const validationErrors = Object.values(errorResponse.errors);
      if (validationErrors.length > 0) {
        return validationErrors[0] as string;
      }
    }

    return null;
  }

  /**
   * Verifica si el error es de red (sin conexión)
   */
  isNetworkError(error: any): boolean {
    return !error || !error.status || error.status === 0;
  }

  /**
   * Verifica si el error requiere reautenticación
   */
  requiresReauth(error: any): boolean {
    return error?.status === 401;
  }

  /**
   * Verifica si el error es de permisos
   */
  isForbiddenError(error: any): boolean {
    return error?.status === 403;
  }
}

