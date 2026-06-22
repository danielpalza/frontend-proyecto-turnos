/**
 * Configuración de la API
 */
const isProduction = window.location.hostname !== 'localhost';

export const API_CONFIG = {
  baseUrl: isProduction
  ? 'https://backend-turnos-jg3n.onrender.com/api'
  : 'http://localhost:8080/api',
  endpoints: {
    patients: '/patients',
    profesionales: '/profesionales',
    appointments: '/appointments',
    auth: '/auth',
    configuration: '/configuration'
  }
};