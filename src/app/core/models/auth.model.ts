export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Request de registro.
 * - Si se envia `organizacionNombre` se crea una organizacion nueva (el usuario queda como OWNER).
 * - Si se envia `invitationToken` el usuario se une a la organizacion de esa invitacion como USER,
 *   con los modulos que el dueño le haya otorgado al generarla.
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  identificacion?: string;
  telefono?: string;
  organizacionNombre?: string;
  pais?: string;
  invitationToken?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  role: string;
  organizationId: string;
  organizationNombre: string;
  organizationPais: string;
  modules: string[];
}