/**
 * Configuración de la API
 */
// Detectar si estamos en producción
const isProduction = window.location.hostname !== 'localhost';

export const API_CONFIG = {
  baseUrl: isProduction 
  ? 'https://backend-turnos-jg3n.onrender.com/api'  // ← Cambiá esto por tu URL de Render
  : 'http://localhost:8080/api',
  endpoints: {
    patients: '/patients',
    profesionales: '/profesionales',
    appointments: '/appointments'
  }
};

// ver de usar variables de entorno de vercel