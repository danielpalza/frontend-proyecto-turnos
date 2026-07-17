import { Appointment } from '../../../core/models';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function getAppointmentColor(appointment: Appointment): string {
  const hasDebt = appointment.totalPrecio && appointment.totalPrecio > 0;
  const estado = appointment.estado || 'PENDIENTE';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appDate = new Date(appointment.fecha + 'T00:00:00');
  const isPast = appDate < today;

  // Rojo: turnos con deuda
  if (hasDebt) {
    return 'red';
  }

  // Verde: turnos completados/pagados sin deuda
  if (estado === 'COMPLETADO' || estado === 'CONFIRMADO') {
    return 'green';
  }

  // Gris: turnos cancelados, no asistió, o pasados sin deuda (chequear antes que "orange"
  // para que un PENDIENTE/EN_CURSO vencido se vea gris, no naranja)
  if (estado === 'CANCELADO' || estado === 'NO_ASISTIO' || isPast) {
    return 'gray';
  }

  // Naranja/Amarillo: turnos programados/confirmados sin deuda, todavía no vencidos
  if (estado === 'PENDIENTE' || estado === 'EN_CURSO') {
    return 'orange';
  }

  return 'gray';
}

export function getStatusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'CONFIRMADO': return 'badge-confirmado';
    case 'PENDIENTE': return 'badge-pendiente';
    case 'EN_CURSO': return 'badge-en-curso';
    case 'COMPLETADO': return 'badge-completado';
    case 'CANCELADO': return 'badge-cancelado';
    case 'NO_ASISTIO': return 'badge-no-asistio';
    default: return 'badge-sin-estado';
  }
}

export function getStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'CONFIRMADO': return 'Confirmado';
    case 'PENDIENTE': return 'Pendiente';
    case 'EN_CURSO': return 'En Curso';
    case 'COMPLETADO': return 'Completado';
    case 'CANCELADO': return 'Cancelado';
    case 'NO_ASISTIO': return 'No Asistió';
    default: return status || 'Sin estado';
  }
}
