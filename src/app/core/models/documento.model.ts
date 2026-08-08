/** Entidades a las que se puede linkear un documento genérico (ver DocumentoController en el backend). */
export type TipoEntidadDocumento = 'APPOINTMENT' | 'PATIENT' | 'PROFESIONAL';

/** Misma forma que DocumentoAdjunto de Coberturas (coberturas.models.ts) — DTO compartido en el backend. */
export interface DocumentoAdjunto {
  id: string;
  nombreArchivo: string;
  tipoArchivo: 'pdf' | 'docx' | 'doc';
  tipoDocumento: string | null;
  urlStorage: string;
  tamanoBytes: number | null;
  subidoPorNombre: string | null;
  createdAt: string | null;
}

export const TIPOS_DOCUMENTO_GENERICO: { codigo: string; nombre: string }[] = [
  { codigo: 'historia_clinica', nombre: 'Historia clínica' },
  { codigo: 'estudio', nombre: 'Estudio / radiografía' },
  { codigo: 'consentimiento', nombre: 'Consentimiento informado' },
  { codigo: 'receta', nombre: 'Receta' },
  { codigo: 'otro', nombre: 'Otro' }
];
