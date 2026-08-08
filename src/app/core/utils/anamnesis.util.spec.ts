import { parseAnamnesis, hasAnamnesis, EMPTY_ANAMNESIS } from './anamnesis.util';

describe('parseAnamnesis', () => {
  it('raw falsy devuelve EMPTY_ANAMNESIS', () => {
    expect(parseAnamnesis(undefined)).toEqual(EMPTY_ANAMNESIS);
    expect(parseAnamnesis(null)).toEqual(EMPTY_ANAMNESIS);
    expect(parseAnamnesis('')).toEqual(EMPTY_ANAMNESIS);
  });

  it('texto plano no-JSON (formato legado de pacientes viejos) cae a EMPTY_ANAMNESIS sin lanzar', () => {
    expect(() => parseAnamnesis('Alergia a la penicilina')).not.toThrow();
    expect(parseAnamnesis('Alergia a la penicilina')).toEqual(EMPTY_ANAMNESIS);
  });

  it('JSON válido pero array o primitivo cae a EMPTY_ANAMNESIS', () => {
    expect(parseAnamnesis('[1,2]')).toEqual(EMPTY_ANAMNESIS);
    expect(parseAnamnesis('5')).toEqual(EMPTY_ANAMNESIS);
  });

  it('arma items solo con los campos presentes, en el orden fijo de ANAMNESIS_FIELDS (no el del JSON)', () => {
    const raw = JSON.stringify({ alergias: 'Penicilina', enfermedades: 'Diabetes' });
    const result = parseAnamnesis(raw);
    expect(result.items.map(i => i.label)).toEqual(['Enfermedades', 'Alergias']);
  });

  it('campos con valores no-string se excluyen en silencio', () => {
    const raw = JSON.stringify({ enfermedades: 123 });
    expect(parseAnamnesis(raw).items).toEqual([]);
  });

  it('otrosAntecedentes del JSON se mapea a "otros" en la salida', () => {
    const raw = JSON.stringify({ otrosAntecedentes: 'Fuma' });
    expect(parseAnamnesis(raw).otros).toBe('Fuma');
  });
});

describe('hasAnamnesis', () => {
  it('false para EMPTY_ANAMNESIS', () => {
    expect(hasAnamnesis(EMPTY_ANAMNESIS)).toBe(false);
  });

  it('true si hay items', () => {
    expect(hasAnamnesis({ items: [{ label: 'x', value: 'y' }], otros: '' })).toBe(true);
  });

  it('true si hay texto en otros', () => {
    expect(hasAnamnesis({ items: [], otros: 'algo' })).toBe(true);
  });
});
