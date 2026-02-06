import { FormBuilder, Validators } from '@angular/forms';

/**
 * Configuración de controles del formulario de paciente.
 * Usado por appointment-dialog (paciente + turno + pago) y seguimiento (solo paciente).
 */
export function getPatientFormConfig(fb: FormBuilder) {
  return {
    nombreApellido: ['', Validators.required],
    fechaNacimiento: [''],
    edad: [{ value: '', disabled: true }],
    dni: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
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
    obraSocialNombre: ['', Validators.required],
    planCategoria: [''],
    obraSocialNumero: [''],
    obraSocialVencimiento: [''],
    esTitular: ['si'],
    nombreTitular: [''],
    dniTitular: [''],
    parentesco: ['']
  };
}

export const OBRAS_SOCIALES = [
  'Particular', 'OSDEPYM', 'PAMI', 'OSPAT', 'OSPE', 'OSDE', 'OSDOP', 'OSPJN', 'OSMATA', 'OSPRERA', 'OSSEG',
  'OSDIPP', 'OSPAP', 'OSPECON', 'OSPERYHRA', 'OSPM', 'OSPT', 'OSPRA', 'OSECAC', 'UOM Salud', 'OSEIV', 'OSMITA',
  'OSPDH', 'OSPIF', 'OSPED', 'OSPIT', 'OSPF', 'OSPTR', 'UOM', 'UOCRA Salud', 'OSCHOCA (Camioneros)', 'UTEDYC',
  'OSPEDYC', 'OSPIM', 'OSPLAD', 'SUTEBA', 'FEB', 'AMET', 'OSPSA (Sanidad)', 'OSPAGA', 'OSPACP', 'OSPAC (Aeronavegantes)',
  'OSPIL', 'OSFE', 'OSPIA', 'OSUOMRA', 'OSPPRA', 'OSBA (Bancaria)', 'OSUTHGRA', 'Swiss Medical', 'Medicus', 'Galeno',
  'Omint', 'Sancor Salud', 'Hominis', 'Avalian', 'Prevención Salud', 'Hospital Italiano Plan de Salud', 'Accord Salud',
  'Medifé', 'Boreal Salud', 'ACA Salud', 'AMEBPBA', 'Staff Médico', 'IOMA', 'OSEP', 'IPROSS', 'ISSN', 'IOSCOR', 'APROSS',
  'ISJ', 'SEROS', 'DOSEP', 'OSPTDF', 'OSEPJ', 'IAPOS', 'ISSSyP', 'IPS Misiones', 'IPS Salta'
];
