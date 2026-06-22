import { Profesional } from '../models';

/**
 * En el nuevo modelo, los profesionales solo tienen `activo`.
 * Si no estan activos no se pueden asignar a turnos.
 */
export function isProfesionalActive(prof: Profesional): boolean {
  return prof.activo !== false;
}

export function isProfesionalAssignable(prof: Profesional): boolean {
  return isProfesionalActive(prof);
}

export function isProfesionalAssignableForReassign(prof: Profesional): boolean {
  return isProfesionalAssignable(prof);
}

export function isProfesionalAssignableForNewAppointment(
  prof: Profesional,
  _fechaTurno: string
): boolean {
  return isProfesionalAssignable(prof);
}

export function filterProfesionalesForNewAppointment(
  profesionales: Profesional[],
  _fechaTurno: string
): Profesional[] {
  return profesionales.filter(p => isProfesionalAssignableForNewAppointment(p, _fechaTurno));
}

export function filterProfesionalesForReassign(profesionales: Profesional[]): Profesional[] {
  return profesionales.filter(p => isProfesionalAssignableForReassign(p));
}