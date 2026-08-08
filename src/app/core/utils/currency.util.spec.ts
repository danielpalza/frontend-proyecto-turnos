import { formatCurrency } from './currency.util';

describe('formatCurrency', () => {
  it('undefined, null y 0 devuelven cadena vacía', () => {
    expect(formatCurrency(undefined)).toBe('');
    expect(formatCurrency(null)).toBe('');
    expect(formatCurrency(0)).toBe('');
  });

  it('formatea un monto positivo con separador de miles es-AR', () => {
    expect(formatCurrency(1234)).toBe('$1.234');
  });

  it('el signo negativo va antes del $', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('muestra decimales cuando los hay', () => {
    expect(formatCurrency(10.5)).toContain('10');
    expect(formatCurrency(10.5)).not.toBe(formatCurrency(10));
  });
});
