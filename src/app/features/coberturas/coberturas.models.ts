export type TipoLink = 'verificacion' | 'aranceles' | 'autorizacion' | 'portal_prestador' | 'otro';
export type Confianza = 'alta' | 'media' | 'baja' | 'sin_investigar';

export const TIPO_LINK_LABELS: Record<string, string> = {
  verificacion: 'Verificar afiliado',
  aranceles: 'Aranceles',
  autorizacion: 'Autorización',
  portal_prestador: 'Portal prestador',
  otro: 'Más información'
};

export interface CoberturaLink {
  id: string;
  tipo: TipoLink;
  url: string | null;
  notasAcceso: string | null;
  confianza: Confianza;
}

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

export interface Cobertura {
  id: string;
  pais: string;
  tipoEntidad: string;
  sigla: string | null;
  nombre: string;
  divisionAdministrativa: string | null;
  alias: string | null;
  esPlaceholder: boolean;
  favorito: boolean;
  notasPropias: string | null;
  telefonoPropio: string | null;
  webPropia: string | null;
  links: CoberturaLink[];
  documentos: DocumentoAdjunto[];
}

export interface Intermediario {
  id: string;
  nombre: string;
  pais: string;
  divisionAdministrativa?: string | null;
  telefono?: string | null;
  web?: string | null;
  notas?: string | null;
  coberturaIds: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface IntermediarioRequest {
  nombre: string;
  pais: string;
  divisionAdministrativa?: string | null;
  telefono?: string | null;
  web?: string | null;
  notas?: string | null;
  coberturaIds: string[];
}

// Qué países mostrar como chip SÍ es dinámico: viene de GET /coberturas/paises
// (ver CoberturasService.listarPaisesConDatos), no de esta lista.
export type { PaisLatam as Pais } from '../../shared/constants/paises-latam';
export { PAISES_LATAM as NOMBRES_PAIS } from '../../shared/constants/paises-latam';

export const TIPOS_DOCUMENTO: { codigo: string; nombre: string }[] = [
  { codigo: 'convenio', nombre: 'Convenio' },
  { codigo: 'nomenclador', nombre: 'Nomenclador' },
  { codigo: 'autorizacion_formulario', nombre: 'Formulario de autorización' },
  { codigo: 'instructivo_facturacion', nombre: 'Instructivo de facturación' },
  { codigo: 'otro', nombre: 'Otro' }
];
