import { FormBuilder, Validators } from '@angular/forms';

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
    dni: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^[\d\s\-\(\)\+]{7,20}$/)]],
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
    dniTitular: [''],
    parentesco: ['']
  };
}

/** Opción fija fuera del catálogo (paciente sin obra social). El resto de las opciones viene de GET /api/coberturas. */
export const COBERTURA_PARTICULAR = 'Particular';
