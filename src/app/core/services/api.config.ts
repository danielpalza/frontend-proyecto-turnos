/**
 * Configuración de la API
 */
const isProduction = window.location.hostname !== 'localhost';

export const API_CONFIG = {
  // En produccion el backend NO se expone a internet: nginx (mismo contenedor
  // que sirve la SPA) proxea /api hacia el contenedor del backend por la red
  // interna de Docker. Al ser mismo origen desaparece el CORS y sobra un
  // solo certificado SSL. En dev seguimos apuntando al Spring Boot local.
  baseUrl: isProduction
  ? '/api'
  : 'http://localhost:8080/api',
  endpoints: {
    patients: '/patients',
    profesionales: '/profesionales',
    appointments: '/appointments',
    auth: '/auth',
    configuration: '/configuration',
    coberturas: '/coberturas',
    intermediarios: '/intermediarios',
    invitations: '/invitations',
    admin: '/admin',
    subscription: '/subscription'
  }
};