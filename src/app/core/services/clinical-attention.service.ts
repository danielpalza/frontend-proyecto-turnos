import { Injectable } from '@angular/core';

export interface LastAttention {
  appointmentId: string;
  rutaClinica: string;
}

const KEY = 'ultima_atencion';

/**
 * Recuerda el último turno clínico atendido en la sesión actual, sin importar a qué módulo
 * pertenece (Odontograma, Historia Clínica, o cualquier módulo clínico futuro).
 *
 * Reemplaza las claves de `sessionStorage` que antes mantenía cada módulo por separado
 * (`odontograma_last_appointment_id`, `lastAppointment:HISTORIA_CLINICA_FREE`): una sesión solo
 * puede estar atendiendo un turno a la vez, así que no tiene sentido que cada módulo lleve su
 * propio "último turno" independiente.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalAttentionService {
  record(appointmentId: string, rutaClinica: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(KEY, JSON.stringify({ appointmentId, rutaClinica }));
  }

  getLast(): LastAttention | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LastAttention;
    } catch {
      return null;
    }
  }
}
