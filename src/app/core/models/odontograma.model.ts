export type CaraDiente = 'arriba' | 'derecha' | 'centro' | 'izquierda' | 'abajo';
export type EstadoCara = 'normal' | 'caries' | 'obturacion' | 'ausente' | 'otro';
export type CategoriaLeyenda = 'estado' | 'condicion';
export type ValorLeyenda =
  | 'ausencia' | 'implante' | 'corona' | 'puente'
  | 'erupcion' | 'retencion' | 'impactado' | 'extraer'
  | 'endodoncia' | 'fractura' | 'lesion' | 'dolor_sensibilidad';

export type FaceKey = 'top' | 'right' | 'center' | 'left' | 'bottom';

import { PeriodontogramaDeltaRequest, PeriodontogramaResponse } from './periodontograma.model';

export interface CaraDelta {
  numeroDiente: number;
  cara: CaraDiente;
  estado: EstadoCara;
}

export interface LeyendaDelta {
  numeroDiente: number;
  ausencia?: boolean;
  implante?: boolean;
  corona?: boolean;
  puente?: boolean;
  erupcion?: boolean;
  retencion?: boolean;
  impactado?: boolean;
  extraer?: boolean;
  endodoncia?: boolean;
  fractura?: boolean;
  lesion?: boolean;
  'dolor_sensibilidad'?: boolean;
  ausente?: boolean;
  movilidad?: number | null;
  furca?: number | null;
}

export interface OdontogramaEstadoActual {
  caras: CaraDelta[];
  leyendas: LeyendaDelta[];
}

export interface OdontogramaPagoDelta {
  precioBono?: number;
  precioTratamiento?: number;
  extras?: number;
  montoPago?: number;
  observaciones?: string;
  observacionesTurno?: string;
}

export interface OdontogramaDeltaRequest {
  comentario?: string;
  planTratamiento?: string;
  caras?: CaraDelta[];
  leyendas?: LeyendaDelta[];
  pago?: OdontogramaPagoDelta;
}

export interface OdontogramaResponse {
  appointmentId: string;
  patientId: string;
  comentario?: string;
  planTratamiento?: string;
  comentarioAnterior?: string;
  creadoEn?: string;
  estadoActual: OdontogramaEstadoActual;
  cambiosTurno: OdontogramaEstadoActual;
}

export const FACE_KEY_TO_CARA: Record<FaceKey, CaraDiente> = {
  top: 'arriba',
  right: 'derecha',
  center: 'centro',
  left: 'izquierda',
  bottom: 'abajo'
};

export const CARA_TO_FACE_KEY: Record<CaraDiente, FaceKey> = {
  arriba: 'top',
  derecha: 'right',
  centro: 'center',
  izquierda: 'left',
  abajo: 'bottom'
};

export const LEYENDA_LABEL_TO_VALOR: Record<string, { categoria: CategoriaLeyenda; valor: ValorLeyenda }> = {
  'Ausencia': { categoria: 'estado', valor: 'ausencia' },
  'Implante': { categoria: 'estado', valor: 'implante' },
  'Corona': { categoria: 'estado', valor: 'corona' },
  'Puente': { categoria: 'estado', valor: 'puente' },
  'Eripcion': { categoria: 'estado', valor: 'erupcion' },
  'Retencion': { categoria: 'estado', valor: 'retencion' },
  'Erupcion': { categoria: 'estado', valor: 'erupcion' },
  'Impactado': { categoria: 'estado', valor: 'impactado' },
  'Extraer': { categoria: 'estado', valor: 'extraer' },
  'Endodoncia': { categoria: 'condicion', valor: 'endodoncia' },
  'Fractura': { categoria: 'condicion', valor: 'fractura' },
  'Lesion': { categoria: 'condicion', valor: 'lesion' },
  'Dolor/Sensibilidad': { categoria: 'condicion', valor: 'dolor_sensibilidad' }
};

export const VALOR_TO_LEYENDA_LABEL: Partial<Record<ValorLeyenda, string>> = {
  ausencia: 'Ausencia',
  implante: 'Implante',
  corona: 'Corona',
  puente: 'Puente',
  erupcion: 'Erupcion',
  retencion: 'Retencion',
  impactado: 'Impactado',
  extraer: 'Extraer',
  endodoncia: 'Endodoncia',
  fractura: 'Fractura',
  lesion: 'Lesion',
  dolor_sensibilidad: 'Dolor/Sensibilidad'
};

export interface TurnoCompletoDeltaRequest {
  odontograma: OdontogramaDeltaRequest;
  periodontograma: PeriodontogramaDeltaRequest;
}

export interface TurnoCompletoResponse {
  appointmentId: string;
  patientId: string;
  odontograma: OdontogramaResponse;
  periodontograma: PeriodontogramaResponse;
}