// src/app/models/user.model.ts

export interface User {
  id: number;                 // Alias para usuario_id (compatibilidad)
  usuario_id: number;         // ID real de la base de datos
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  rol_id: number;
  activo: number;
  fecha_registro?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  apellido_paterno: string;
  email: string;
  password: string;
  rol: string;
  apellido_materno?: string;
  telefono?: string;
  fecha_nacimiento?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
  requireEmailVerification?: boolean;
  email?: string;
}
