// src/app/models/user.model.ts

export interface User {
  usuario_id: number;         // ✅ No "id"
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  rol_id: number;             // ✅ No "rol" (es numérico: 1=admin, 2=paciente, 3=doctor)
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
