import { Profesional } from '../models';

const ESTADO_DISPONIBLE = 'Disponible';
const ESTADO_NO_DISPONIBLE = 'No disponible';

export function isProfesionalActive(prof: Profesional): boolean {
  return prof.activo !== false;
}

export function getProfesionalEstado(prof: Profesional): string {
  return prof.estado ?? ESTADO_DISPONIBLE;
}

/** Reasignación: solo usuarios activos con estado "Disponible". */
export function isProfesionalAssignableForReassign(prof: Profesional): boolean {
  return isProfesionalActive(prof) && getProfesionalEstado(prof) === ESTADO_DISPONIBLE;
}

function isDateInPeriod(fechaTurno: string, desde: string, hasta?: string | null): boolean {
  if (fechaTurno < desde) {
    return false;
  }
  if (hasta && fechaTurno > hasta) {
    return false;
  }
  return true;
}

/**
 * Nueva cita: activo, "No disponible" bloquea siempre,
 * "Disponible" siempre permitido, otros estados bloqueados si la fecha cae en [desde, hasta].
 */
export function isProfesionalAssignableForNewAppointment(
  prof: Profesional,
  fechaTurno: string
): boolean {
  if (!isProfesionalActive(prof)) {
    return false;
  }

  const estado = getProfesionalEstado(prof);

  if (estado === ESTADO_NO_DISPONIBLE) {
    return false;
  }

  if (estado === ESTADO_DISPONIBLE) {
    return true;
  }

  if (!prof.desde) {
    return false;
  }

  return !isDateInPeriod(fechaTurno, prof.desde, prof.hasta);
}

export function filterProfesionalesForNewAppointment(
  profesionales: Profesional[],
  fechaTurno: string
): Profesional[] {
  return profesionales.filter(p => isProfesionalAssignableForNewAppointment(p, fechaTurno));
}

export function filterProfesionalesForReassign(profesionales: Profesional[]): Profesional[] {
  return profesionales.filter(p => isProfesionalAssignableForReassign(p));
}
