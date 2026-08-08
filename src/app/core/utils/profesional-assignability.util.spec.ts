import {
  isProfesionalActive,
  isProfesionalAssignable,
  isProfesionalAssignableForReassign,
  isProfesionalAssignableForNewAppointment,
  filterProfesionalesForNewAppointment,
  filterProfesionalesForReassign
} from './profesional-assignability.util';
import { Profesional } from '../models';

function profesional(overrides: Partial<Profesional> = {}): Profesional {
  return { id: 'p1', nombre: 'Juan', apellido: 'Pérez', ...overrides } as Profesional;
}

describe('isProfesionalActive', () => {
  it('activo: true → true', () => {
    expect(isProfesionalActive(profesional({ activo: true }))).toBe(true);
  });

  it('activo: false → false', () => {
    expect(isProfesionalActive(profesional({ activo: false }))).toBe(false);
  });

  it('activo ausente (undefined, campo nunca seteado) se interpreta como activo', () => {
    expect(isProfesionalActive(profesional({ activo: undefined }))).toBe(true);
  });
});

describe('las variantes de asignabilidad son, hoy, pass-throughs de isProfesionalActive', () => {
  it('un profesional inactivo no es asignable por ninguna variante', () => {
    const inactivo = profesional({ activo: false });
    expect(isProfesionalAssignable(inactivo)).toBe(false);
    expect(isProfesionalAssignableForReassign(inactivo)).toBe(false);
    expect(isProfesionalAssignableForNewAppointment(inactivo, '2026-08-07')).toBe(false);
  });

  it('la fecha no influye en isProfesionalAssignableForNewAppointment (no hay regla por fecha hoy)', () => {
    const activo = profesional({ activo: true });
    expect(isProfesionalAssignableForNewAppointment(activo, '1999-01-01')).toBe(true);
    expect(isProfesionalAssignableForNewAppointment(activo, '2099-12-31')).toBe(true);
  });
});

describe('filterProfesionalesForNewAppointment / filterProfesionalesForReassign', () => {
  it('filtran solo los activos de una lista mixta', () => {
    const lista = [profesional({ id: '1', activo: true }), profesional({ id: '2', activo: false })];
    expect(filterProfesionalesForNewAppointment(lista, '2026-08-07').map(p => p.id)).toEqual(['1']);
    expect(filterProfesionalesForReassign(lista).map(p => p.id)).toEqual(['1']);
  });
});
