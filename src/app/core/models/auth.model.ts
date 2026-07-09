export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Request de registro.
 * - Si se envia `organizacionNombre` se crea una organizacion nueva (el usuario queda como OWNER).
 * - Si se envia `organizationId` el usuario se une a esa organizacion como USER.
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  organizacionNombre?: string;
  pais?: string;
  organizationId?: string;
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