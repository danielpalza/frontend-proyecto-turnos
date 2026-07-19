/**
 * Formatea un monto en pesos (punto como separador de miles, coma para decimales cuando los hay),
 * consistente en toda la app. Devuelve cadena vacía para montos nulos/indefinidos/cero.
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (!amount) return '';
  const sign = amount < 0 ? '-' : '';
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
  return `${sign}$${formatted}`;
}
