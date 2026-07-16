export interface WizardStepDef {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  /** true solo para el paso de Turno y pago, que es condicional a includeAppointmentStep */
  appointmentOnly?: boolean;
  /** Controles cuya validez determina si se puede avanzar desde este paso */
  requiredControls: string[];
}

export const PATIENT_WIZARD_STEPS: WizardStepDef[] = [
  {
    id: 1,
    title: 'Datos personales',
    subtitle: 'Información básica del paciente',
    icon: 'bi-person',
    requiredControls: ['nombre', 'apellido', 'dni', 'telefono', 'email', 'domicilio', 'localidad']
  },
  {
    id: 2,
    title: 'Antecedentes médicos',
    subtitle: 'Historia clínica del paciente',
    icon: 'bi-clipboard2-pulse',
    requiredControls: []
  },
  {
    id: 3,
    title: 'Cobertura',
    subtitle: 'Cobertura y datos del titular',
    icon: 'bi-shield-check',
    requiredControls: ['coberturaNombre', 'nombreTitular', 'dniTitular', 'parentesco']
  },
  {
    id: 4,
    title: 'Turno y pago',
    subtitle: 'Detalles del turno y pago inicial',
    icon: 'bi-calendar-event',
    appointmentOnly: true,
    requiredControls: []
  },
  {
    id: 5,
    title: 'Revisión final',
    subtitle: 'Confirmá los datos antes de guardar',
    icon: 'bi-check2-circle',
    requiredControls: []
  }
];

export interface ReviewField {
  name: string;
  label: string;
  format?: (value: any) => string;
}

export interface ReviewGroup {
  stepId: number;
  title: string;
  icon: string;
  fields: ReviewField[];
}

export const PATIENT_WIZARD_REVIEW_GROUPS: ReviewGroup[] = [
  {
    stepId: 1,
    title: 'Datos personales',
    icon: 'bi-person',
    fields: [
      { name: 'nombre', label: 'Nombre' },
      { name: 'apellido', label: 'Apellido' },
      { name: 'fechaNacimiento', label: 'Fecha de nacimiento' },
      { name: 'edad', label: 'Edad' },
      { name: 'dni', label: 'Documento' },
      { name: 'telefono', label: 'Teléfono' },
      { name: 'email', label: 'Email' },
      { name: 'domicilio', label: 'Domicilio' },
      { name: 'localidad', label: 'Localidad' },
      { name: 'contactoEmergencia', label: 'Contacto de emergencia' }
    ]
  },
  {
    stepId: 2,
    title: 'Antecedentes médicos',
    icon: 'bi-clipboard2-pulse',
    fields: [
      { name: 'enfermedades', label: 'Enfermedades' },
      { name: 'alergias', label: 'Alergias' },
      { name: 'medicacion', label: 'Medicación' },
      { name: 'cirugias', label: 'Cirugías/tratamientos' },
      { name: 'embarazo', label: 'Embarazo o lactancia' },
      { name: 'marcapasos', label: 'Marcapasos/prótesis' },
      { name: 'consumos', label: 'Consumos' },
      { name: 'otrosAntecedentes', label: 'Otros antecedentes' }
    ]
  },
  {
    stepId: 3,
    title: 'Cobertura',
    icon: 'bi-shield-check',
    fields: [
      { name: 'coberturaNombre', label: 'Cobertura' },
      { name: 'planCategoria', label: 'Plan/Categoría' },
      { name: 'coberturaNumero', label: 'N° de afiliado' },
      { name: 'coberturaVencimiento', label: 'Vencimiento' },
      { name: 'esTitular', label: '¿Es titular?', format: (v: string) => (v === 'no' ? 'No' : 'Sí') },
      { name: 'nombreTitular', label: 'Nombre del titular' },
      { name: 'dniTitular', label: 'Documento del titular' },
      { name: 'parentesco', label: 'Parentesco' }
    ]
  },
  {
    stepId: 4,
    title: 'Turno y pago',
    icon: 'bi-calendar-event',
    fields: [
      // 'profesionalId' se resuelve aparte en el componente (necesita la lista de profesionales)
      { name: 'hora', label: 'Hora del turno' },
      { name: 'observacionesTurno', label: 'Observaciones del turno' },
      { name: 'precioBono', label: 'Precio de bono' },
      { name: 'precioTratamiento', label: 'Precio tratamiento' },
      { name: 'extras', label: 'Extras' },
      { name: 'montoPago', label: 'Monto pagado' },
      { name: 'observaciones', label: 'Observaciones de pago' }
    ]
  }
];
