import { fullName } from './full-name.util';

describe('fullName', () => {
  it('junta nombre y apellido con un espacio', () => {
    expect(fullName('Ana', 'García')).toBe('Ana García');
  });

  it('con solo nombre', () => {
    expect(fullName('Ana', undefined)).toBe('Ana');
  });

  it('con solo apellido', () => {
    expect(fullName(undefined, 'García')).toBe('García');
  });

  it('sin ninguno: cadena vacía', () => {
    expect(fullName(undefined, undefined)).toBe('');
    expect(fullName(null, null)).toBe('');
  });

  it('descarta partes en blanco', () => {
    expect(fullName('   ', 'García')).toBe('García');
  });
});
