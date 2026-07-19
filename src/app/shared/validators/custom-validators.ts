import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/**
 * Documento de identidad (DNI/RUT/CURP/Cédula/etc.): regla genérica para toda Latinoamérica,
 * sin dígito verificador por país. Alfanumérico, 5 a 20 caracteres.
 */
export const DOCUMENT_NUMBER_PATTERN = /^[A-Za-z0-9]{5,20}$/;

/**
 * Teléfono: dígitos, espacios, guiones, paréntesis o +, 7 a 20 caracteres.
 * Es la misma regla ya usada históricamente para el teléfono del paciente.
 */
export const PHONE_PATTERN = /^[\d\s\-\(\)\+]{7,20}$/;

/**
 * Nombre de persona: letras (con acentos/ñ), espacios, guion y apóstrofe
 * (para permitir nombres como "Jean-Pierre" u "O'Higgins").
 */
export const PERSON_NAME_PATTERN = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ'\- ]+$/;

function patternValidator(pattern: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    return pattern.test(control.value) ? null : { pattern: { requiredPattern: pattern.toString(), actualValue: control.value } };
  };
}

export function documentNumberValidator(): ValidatorFn {
  return patternValidator(DOCUMENT_NUMBER_PATTERN);
}

export function phoneValidator(): ValidatorFn {
  return patternValidator(PHONE_PATTERN);
}

export function personNameValidator(): ValidatorFn {
  return patternValidator(PERSON_NAME_PATTERN);
}

/** Para inputs de dinero en formularios reactivos: usar Validators.min(0) directamente. */
export const nonNegativeMoneyValidators = [Validators.min(0)];
