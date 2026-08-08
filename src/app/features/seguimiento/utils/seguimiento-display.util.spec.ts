import { formatDate, getAppointmentColor, getStatusBadgeClass, getStatusLabel } from './seguimiento-display.util';
import { Appointment } from '../../../core/models';

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', fecha: '2026-08-07', estado: 'PENDIENTE', ...overrides } as Appointment;
}

/** Formatea en local (no toISOString) para no toparse con el mismo corrimiento de timezone que estos utils evitan. */
function toLocalYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('formatDate', () => {
  it('formatea como "D mmm AAAA" en español, parseando como medianoche local', () => {
    expect(formatDate('2026-08-07')).toMatch(/7 ago\.? 2026/i);
  });
});

describe('getAppointmentColor', () => {
  it('con deuda, es rojo sin importar el estado (incluso COMPLETADO)', () => {
    expect(getAppointmentColor(appointment({ estado: 'COMPLETADO', totalPrecio: 500 }))).toBe('red');
  });

  it('sin deuda, COMPLETADO/CONFIRMADO es verde', () => {
    expect(getAppointmentColor(appointment({ estado: 'COMPLETADO', totalPrecio: 0 }))).toBe('green');
    expect(getAppointmentColor(appointment({ estado: 'CONFIRMADO', totalPrecio: 0 }))).toBe('green');
  });

  it('sin deuda, CANCELADO/NO_ASISTIO es gris', () => {
    expect(getAppointmentColor(appointment({ estado: 'CANCELADO', totalPrecio: 0 }))).toBe('gray');
    expect(getAppointmentColor(appointment({ estado: 'NO_ASISTIO', totalPrecio: 0 }))).toBe('gray');
  });

  it('un PENDIENTE vencido (fecha pasada) sin deuda es gris, no naranja', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    expect(getAppointmentColor(appointment({ estado: 'PENDIENTE', fecha: toLocalYYYYMMDD(ayer), totalPrecio: 0 }))).toBe('gray');
  });

  it('un PENDIENTE/EN_CURSO futuro sin deuda es naranja', () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    expect(getAppointmentColor(appointment({ estado: 'PENDIENTE', fecha: toLocalYYYYMMDD(manana), totalPrecio: 0 }))).toBe('orange');
  });

  it('hoy no cuenta como pasado', () => {
    expect(getAppointmentColor(appointment({ estado: 'PENDIENTE', fecha: toLocalYYYYMMDD(new Date()), totalPrecio: 0 }))).toBe('orange');
  });
});

describe('getStatusBadgeClass', () => {
  it('mapea cada estado conocido a su clase', () => {
    expect(getStatusBadgeClass('CONFIRMADO')).toBe('badge-confirmado');
    expect(getStatusBadgeClass('PENDIENTE')).toBe('badge-pendiente');
    expect(getStatusBadgeClass('EN_CURSO')).toBe('badge-en-curso');
    expect(getStatusBadgeClass('COMPLETADO')).toBe('badge-completado');
    expect(getStatusBadgeClass('CANCELADO')).toBe('badge-cancelado');
    expect(getStatusBadgeClass('NO_ASISTIO')).toBe('badge-no-asistio');
  });

  it('sin status o no reconocido: clase genérica', () => {
    expect(getStatusBadgeClass(undefined)).toBe('badge-sin-estado');
    expect(getStatusBadgeClass('ALGO_RARO')).toBe('badge-sin-estado');
  });
});

describe('getStatusLabel', () => {
  it('mapea cada estado conocido a su label en español', () => {
    expect(getStatusLabel('CONFIRMADO')).toBe('Confirmado');
    expect(getStatusLabel('PENDIENTE')).toBe('Pendiente');
    expect(getStatusLabel('EN_CURSO')).toBe('En Curso');
    expect(getStatusLabel('COMPLETADO')).toBe('Completado');
    expect(getStatusLabel('CANCELADO')).toBe('Cancelado');
    expect(getStatusLabel('NO_ASISTIO')).toBe('No Asistió');
  });

  it('un status no mapeado pero truthy devuelve el string crudo tal cual (no un genérico)', () => {
    expect(getStatusLabel('ALGO_RARO')).toBe('ALGO_RARO');
  });

  it('sin status (falsy) cae a "Sin estado"', () => {
    expect(getStatusLabel(undefined)).toBe('Sin estado');
  });
});
