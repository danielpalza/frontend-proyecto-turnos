/**
 * Formatea un monto en pesos (sin decimales, punto como separador de miles),
 * consistente en toda la app. Devuelve cadena vacía para montos nulos/indefinidos/cero.
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (!amount) return '';
  return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
