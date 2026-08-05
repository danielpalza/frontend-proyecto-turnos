/**
 * Modelo de "Historia Clínica Básica" — módulo HISTORIA_CLINICA_FREE.
 * Formulario genérico de 6 secciones, con flujo de borrador/firma (registro inmutable al firmar).
 */
export type EstadoHistoriaClinica = 'BORRADOR' | 'FIRMADO';

export interface HistoriaClinicaDeltaRequest {
  // Sección 1 — datos del paciente (snapshot)
  nombreCompleto?: string;
  dni?: string;
  fechaConsulta?: string;
  cobertura?: string;
  telefono?: string;

  // Sección 2 — motivo de consulta
  motivoConsulta?: string;

  // Sección 3 — enfermedad actual
  enfermedadActual?: string;

  // Sección 4 — antecedentes médicos del paciente (mismas claves que Patient.anamnesis, ver
  // anamnesis.util.ts). Editar esto también sincroniza la ficha del paciente.
  enfermedades?: string;
  alergias?: string;
  medicacion?: string;
  cirugias?: string;
  embarazo?: string;
  marcapasos?: string;
  consumos?: string;
  otrosAntecedentes?: string;

  // Sección 5 — examen físico
  tensionArterial?: string;
  frecuenciaCardiaca?: number;
  temperatura?: number;
  peso?: number;
  examenPorSistemas?: string;

  // Sección 6 — diagnóstico y plan
  diagnostico?: string;
  diagnosticoCie10Codigo?: string;
  indicaciones?: string;
}

export interface HistoriaClinicaResponse extends HistoriaClinicaDeltaRequest {
  appointmentId: string;
  patientId: string;
  estado: EstadoHistoriaClinica;
  firmadoEn?: string;
  firmadoPorNombre?: string;
  /**
   * `false` cuando el registro está `FIRMADO` (inmutable para siempre) o el turno quedó cerrado por
   * la regla legal de historia clínica (hay un turno más reciente del paciente con registro). El
   * backend lo hace cumplir igual en cada escritura.
   */
  editable?: boolean;
}
