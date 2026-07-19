export interface PaisLatam {
  codigo: string;
  nombre: string;
}

/**
 * Catálogo único de países soportados. Debe mantenerse alineado con
 * LatamCountries.java en el backend (misma lista de códigos).
 */
export const PAISES_LATAM: PaisLatam[] = [
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
