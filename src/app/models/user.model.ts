// src/app/models/user.model.ts

export interface User {
  id: number;                 // ✅ Cambio: id (como está en la BD)
  nombre: string;
  apellido: string;           // ✅ Cambio: apellido (combinado)
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  tipo_usuario: string;       // ✅ Cambio: tipo_usuario ('paciente', 'medico', 'administrador')
  activo: boolean;            // ✅ Cambio: boolean
  email_verificado: boolean;  // ✅ Agregado: email_verificado
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
