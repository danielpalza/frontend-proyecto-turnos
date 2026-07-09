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

export interface Pais {
  codigo: string;
  nombre: string;
}

// Nombres de país (referencia estática, no depende de qué haya cargado en el catálogo).
// Mismos códigos/nombres que PAISES_LATAM en login.component.ts — mantenerlos alineados.
// Qué países mostrar como chip SÍ es dinámico: viene de GET /coberturas/paises
// (ver CoberturasService.listarPaisesConDatos), no de esta lista.
export const NOMBRES_PAIS: Pais[] = [
  { codigo: 'AR', nombre: 'Argentina' },
  { codigo: 'MX', nombre: 'México' },
  { codigo: 'CO', nombre: 'Colombia' },
  { codigo: 'CL', nombre: 'Chile' },
  { codigo: 'PE', nombre: 'Perú' },
  { codigo: 'EC', nombre: 'Ecuador' },
  { codigo: 'BO', nombre: 'Bolivia' },
  { codigo: 'PY', nombre: 'Paraguay' },
  { codigo: 'UY', nombre: 'Uruguay' },
  { codigo: 'VE', nombre: 'Venezuela' },
  { codigo: 'BR', nombre: 'Brasil' },
  { codigo: 'CR', nombre: 'Costa Rica' },
  { codigo: 'PA', nombre: 'Panamá' },
  { codigo: 'GT', nombre: 'Guatemala' },
  { codigo: 'HN', nombre: 'Honduras' },
  { codigo: 'SV', nombre: 'El Salvador' },
  { codigo: 'NI', nombre: 'Nicaragua' },
  { codigo: 'DO', nombre: 'República Dominicana' }
];

export const TIPOS_DOCUMENTO: { codigo: string; nombre: string }[] = [
  { codigo: 'convenio', nombre: 'Convenio' },
  { codigo: 'nomenclador', nombre: 'Nomenclador' },
  { codigo: 'autorizacion_formulario', nombre: 'Formulario de autorización' },
  { codigo: 'instructivo_facturacion', nombre: 'Instructivo de facturación' },
  { codigo: 'otro', nombre: 'Otro' }
];
