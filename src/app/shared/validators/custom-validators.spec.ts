import { FormControl } from '@angular/forms';
import { documentNumberValidator, phoneValidator, personNameValidator, nonNegativeMoneyValidators } from './custom-validators';

describe('documentNumberValidator', () => {
  const validator = documentNumberValidator();

  it('un control vacío es válido (no hace de required)', () => {
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('acepta 5 a 20 caracteres alfanuméricos', () => {
    expect(validator(new FormControl('12345'))).toBeNull();
    expect(validator(new FormControl('A'.repeat(20)))).toBeNull();
  });

  it('rechaza menos de 5 o más de 20 caracteres', () => {
    expect(validator(new FormControl('1234'))).not.toBeNull();
    expect(validator(new FormControl('A'.repeat(21)))).not.toBeNull();
  });

  it('acepta letras (RUT/CURP, no solo DNI numérico)', () => {
    expect(validator(new FormControl('ABC12345'))).toBeNull();
  });
});

describe('phoneValidator', () => {
  const validator = phoneValidator();

  it('un control vacío es válido', () => {
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('acepta un teléfono con formato real', () => {
    expect(validator(new FormControl('+54 11 1234-5678'))).toBeNull();
  });

  it('rechaza letras', () => {
    expect(validator(new FormControl('abc1234567'))).not.toBeNull();
  });
});

describe('personNameValidator', () => {
  const validator = personNameValidator();

  it('acepta nombres con guion (Jean-Pierre)', () => {
    expect(validator(new FormControl('Jean-Pierre'))).toBeNull();
  });

  it("acepta nombres con apóstrofe (O'Higgins)", () => {
    expect(validator(new FormControl("O'Higgins"))).toBeNull();
  });

  it('acepta acentos y ñ', () => {
    expect(validator(new FormControl('Peña Núñez'))).toBeNull();
  });

  it('rechaza un nombre con dígitos', () => {
    expect(validator(new FormControl('Juan123'))).not.toBeNull();
  });
});

describe('nonNegativeMoneyValidators', () => {
  it('rechaza valores negativos', () => {
    expect(new FormControl(-1, nonNegativeMoneyValidators).valid).toBe(false);
  });

  it('acepta 0 y positivos', () => {
    expect(new FormControl(0, nonNegativeMoneyValidators).valid).toBe(true);
    expect(new FormControl(100, nonNegativeMoneyValidators).valid).toBe(true);
  });
});
