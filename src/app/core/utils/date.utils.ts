/**
 * Utilidades para formateo y manipulación de fechas
 * Evita problemas de zona horaria usando formateo manual
 */

/**
 * Formatea una fecha a formato YYYY-MM-DD sin depender de zona horaria
 * Usa formateo manual para evitar problemas con toISOString() cerca de medianoche
 * en zonas horarias negativas (ej: Argentina UTC-3)
 * 
 * @param date - Fecha a formatear
 * @returns Fecha en formato YYYY-MM-DD
 * 
 * @example
 * formatDateToYYYYMMDD(new Date(2024, 0, 15)) // "2024-01-15"
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD sin depender de zona horaria
 * 
 * @returns Fecha actual en formato YYYY-MM-DD
 * 
 * @example
 * getTodayAsYYYYMMDD() // "2024-01-15" (si hoy es 15 de enero de 2024)
 */
export function getTodayAsYYYYMMDD(): string {
  return formatDateToYYYYMMDD(new Date());
}

