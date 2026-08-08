import { resolveHomeRoute } from './home-route';
import { Capability } from './capabilities';

describe('resolveHomeRoute', () => {
  it('sin ninguna capacidad de aterrizaje: devuelve /403', () => {
    expect(resolveHomeRoute(() => false)).toBe('/403');
  });

  it('con capacidad de Seguimiento solamente: saltea /panel y /turnos', () => {
    const hasCapability = (c: string) => c === Capability.SEGUIMIENTO_VIEW;
    expect(resolveHomeRoute(hasCapability)).toBe('/seguimiento');
  });

  it('con PANEL:VIEW entre varias: gana la primera coincidencia de la lista (/panel)', () => {
    const hasCapability = (c: string) => c === Capability.PANEL_VIEW || c === Capability.TURNOS_VIEW;
    expect(resolveHomeRoute(hasCapability)).toBe('/panel');
  });

  it('ODONTOGRAMA:VIEW no tiene ruta de aterrizaje fija: devuelve /403', () => {
    const hasCapability = (c: string) => c === Capability.ODONTOGRAMA_VIEW;
    expect(resolveHomeRoute(hasCapability)).toBe('/403');
  });
});
