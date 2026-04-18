export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  nombre: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  especialidad?: string;
  matricula?: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
  role: string;
  profesionalId?: number;
  profesionalNombre?: string;
  recepcionistaId?: number;
  recepcionistaNombre?: string;
}
