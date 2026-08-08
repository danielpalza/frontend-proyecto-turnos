import {
  Capability,
  MODULE_CAPABILITIES,
  MODULE_IMPLICATIONS,
  resolveCapabilities,
  derivedModules,
  capabilityDeniedMessage
} from './capabilities';

describe('resolveCapabilities', () => {
  it('un módulo simple devuelve solo sus propias capacidades', () => {
    expect(resolveCapabilities(['PANEL'])).toEqual(new Set([Capability.PANEL_VIEW]));
  });

  it('ODONTOGRAMA arrastra TURNOS:VIEW (Regla A parcial) pero no SEGUIMIENTO (sin clausura transitiva)', () => {
    const result = resolveCapabilities(['ODONTOGRAMA']);
    expect(result.has(Capability.ODONTOGRAMA_VIEW)).toBe(true);
    expect(result.has(Capability.ODONTOGRAMA_EDIT)).toBe(true);
    expect(result.has(Capability.TURNOS_VIEW)).toBe(true);
    expect(result.has(Capability.SEGUIMIENTO_VIEW)).toBe(false);
  });

  it('HISTORIA_CLINICA_FREE tiene el mismo patrón parcial que ODONTOGRAMA', () => {
    const result = resolveCapabilities(['HISTORIA_CLINICA_FREE']);
    expect(result.has(Capability.HISTORIA_CLINICA_FREE_VIEW)).toBe(true);
    expect(result.has(Capability.TURNOS_VIEW)).toBe(true);
    expect(result.has(Capability.SEGUIMIENTO_VIEW)).toBe(false);
  });

  it('TURNOS arrastra TODAS las capacidades de SEGUIMIENTO (Regla B, total)', () => {
    const result = resolveCapabilities(['TURNOS']);
    for (const cap of MODULE_CAPABILITIES.SEGUIMIENTO) {
      expect(result.has(cap)).toBe(true);
    }
    for (const cap of MODULE_CAPABILITIES.TURNOS) {
      expect(result.has(cap)).toBe(true);
    }
  });

  it('sin módulos concedidos: set vacío', () => {
    expect(resolveCapabilities([])).toEqual(new Set());
  });

  it('un código desconocido no revienta y no aporta capacidades', () => {
    expect(resolveCapabilities(['CODIGO_INEXISTENTE'])).toEqual(new Set());
  });
});

describe('derivedModules', () => {
  it('TURNOS no se incluye a sí mismo aunque cumpla sus propias capacidades', () => {
    expect(derivedModules(['TURNOS']).has('TURNOS')).toBe(false);
  });

  it('ODONTOGRAMA deriva TURNOS (por el spillover de TURNOS_VIEW)', () => {
    expect(derivedModules(['ODONTOGRAMA']).has('TURNOS')).toBe(true);
  });
});

describe('capabilityDeniedMessage', () => {
  it('PROFESIONALES_DELETE tiene un mensaje especial fijo, sin pasar por el módulo dueño', () => {
    expect(capabilityDeniedMessage(Capability.PROFESIONALES_DELETE)).toBe(
      'Solo el dueño de la organización puede eliminar profesionales'
    );
  });

  it('una capacidad común arma "Requiere acceso a <label del módulo>"', () => {
    expect(capabilityDeniedMessage(Capability.TURNOS_VIEW)).toBe('Requiere acceso a Turnos');
  });

  it('una capacidad sin módulo dueño conocido cae al mensaje genérico', () => {
    expect(capabilityDeniedMessage('CODIGO_INEXISTENTE:VIEW')).toBe('No tenés permiso para esta acción');
  });
});

describe('reglas de MODULE_IMPLICATIONS (estructural, mismo espíritu que CapabilityCatalogTest del backend)', () => {
  it('hay exactamente tres reglas de implicación, ni más ni menos', () => {
    expect(Object.keys(MODULE_IMPLICATIONS)).toHaveLength(3);
  });
});
