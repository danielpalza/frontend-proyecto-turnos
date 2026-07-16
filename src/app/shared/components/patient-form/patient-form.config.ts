import { FormBuilder, Validators } from '@angular/forms';
import { documentNumberValidator, phoneValidator } from '../../validators/custom-validators';

/**
 * Configuración de controles del formulario de paciente.
 * Usado por appointment-dialog (paciente + turno + pago) y seguimiento (solo paciente).
 */
export function getPatientFormConfig(fb: FormBuilder) {
  return {
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    fechaNacimiento: [''],
    edad: [{ value: '', disabled: true }],
    dni: ['', [Validators.required, documentNumberValidator()]],
    telefono: ['', [Validators.required, phoneValidator()]],
    email: ['', [Validators.required, Validators.email]],
    domicilio: ['', Validators.required],
    localidad: ['', Validators.required],
    contactoEmergencia: [''],
    enfermedades: [''],
    alergias: [''],
    medicacion: [''],
    cirugias: [''],
    embarazo: [''],
    marcapasos: [''],
    consumos: [''],
    otrosAntecedentes: ['', Validators.maxLength(300)],
    coberturaNombre: ['', Validators.required],
    /** Vinculación al catálogo global de coberturas (tabla coberturas). Vacío = texto libre sin vincular. */
    coberturaId: [''],
    planCategoria: [''],
    coberturaNumero: [''],
    coberturaVencimiento: [''],
    esTitular: ['si'],
    nombreTitular: [''],
    dniTitular: ['', documentNumberValidator()],
    parentesco: ['']
  };
}

/** Opción fija fuera del catálogo (paciente sin obra social). El resto de las opciones viene de GET /api/coberturas. */
export const COBERTURA_PARTICULAR = 'Particular';
