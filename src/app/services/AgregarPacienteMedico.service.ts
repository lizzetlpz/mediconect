// src/app/services/AgregarPacienteMedico.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

// ============================================
// Interfaces Historial Médico
// ============================================

export interface Medicamento {
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  instrucciones?: string;
}

export interface Estudio {
  nombre: string;
  tipo?: string;
  descripcion?: string;
  archivo_url?: string;
}

export interface NuevoHistorialRequest {
  paciente_nombre: string;
  fecha_consulta: string;
  motivo_consulta: string;
  sintomas?: string;
  diagnostico?: string;
  plan_tratamiento?: string;
  requiere_seguimiento?: boolean;
  notas_medico?: string;
  medicamentos?: Medicamento[];
  estudios?: Estudio[];
}

export interface CrearHistorialResponse {
  success: boolean;
  message: string;
  data?: {
    historial_id: number;
    paciente_id: number;
    paciente_creado: boolean;
    medicamentos_insertados: number;
    estudios_insertados: number;
  };
  error?: string;
}

export interface Paciente {
  usuario_id: number;
  nombre_completo: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
}

export interface BuscarPacienteResponse {
  success: boolean;
  data?: Paciente[];
  message?: string;
}

// ============================================
// Interfaces Registrar Paciente (NUEVO)
// ============================================

export interface RegistrarPacienteRequest {
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  tipo_sangre?: string;
  direccion?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  alergias?: string;
  condiciones_cronicas?: string;
  medicamentos_actuales?: string;
  proveedor_seguro?: string;
  numero_poliza?: string;
}

export interface RegistrarPacienteResponse {
  success: boolean;
  message: string;
  data?: {
    usuario_id: number;
    nombre: string;
    apellido_paterno: string;
    email: string;
  };
  info?: {
    contraseña_temporal: string;
    mensaje: string;
  };
  error?: string;
}

// ============================================
// Servicio
// ============================================

@Injectable({
  providedIn: 'root'
})
export class AgregarPacienteMedicoService {
  private apiUrlHistorial = 'http://localhost:3000/api/agregar-paciente';
  private apiUrlPacientes = 'http://localhost:3000/api/pacientes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    console.log('🔑 Token usado:', token ? 'Presente ✅' : 'Ausente ❌');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ============================================
  // MÉTODOS PARA HISTORIAL MÉDICO
  // ============================================

  /**
   * Crear nuevo historial médico
   */
  crearHistorialMedico(data: NuevoHistorialRequest): Observable<CrearHistorialResponse> {
    console.log('📤 Enviando historial médico:', data);
    console.log('   Paciente:', data.paciente_nombre);
    console.log('   Fecha:', data.fecha_consulta);
    console.log('   Motivo:', data.motivo_consulta);
    console.log('   Medicamentos:', data.medicamentos?.length || 0);
    console.log('   Estudios:', data.estudios?.length || 0);

    return this.http.post<CrearHistorialResponse>(
      this.apiUrlHistorial,
      data,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Respuesta del servidor:', response);
        if (response.success) {
          console.log('🎉 Historial creado exitosamente');
          console.log('   Historial ID:', response.data?.historial_id);
          console.log('   Paciente ID:', response.data?.paciente_id);
          console.log('   Paciente nuevo?:', response.data?.paciente_creado ? 'Sí' : 'No');
        }
      }),
      catchError(error => {
        console.error('❌ Error al crear historial:', error);
        console.error('   Status:', error.status);
        console.error('   Message:', error.error?.message || error.message);
        console.error('   Error completo:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Buscar pacientes por nombre (para autocompletar)
   */
  buscarPacientes(nombre: string): Observable<BuscarPacienteResponse> {
    console.log('🔍 Buscando pacientes con nombre:', nombre);

    return this.http.get<BuscarPacienteResponse>(
      `${this.apiUrlHistorial}/buscar-paciente`,
      {
        params: { nombre },
        headers: this.getHeaders()
      }
    ).pipe(
      tap(response => {
        console.log('✅ Pacientes encontrados:', response.data?.length || 0);
      }),
      catchError(error => {
        console.error('❌ Error buscando pacientes:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // MÉTODOS PARA REGISTRAR PACIENTE (NUEVO)
  // ============================================

  /**
   * Registrar nuevo paciente
   */
  registrarPaciente(data: RegistrarPacienteRequest): Observable<RegistrarPacienteResponse> {
    console.log('📤 Registrando paciente:', data);
    console.log('   Nombre:', data.nombre);
    console.log('   Apellido Paterno:', data.apellido_paterno);
    console.log('   Apellido Materno:', data.apellido_materno);
    console.log('   Email:', data.email);
    console.log('   Teléfono:', data.telefono);

    return this.http.post<RegistrarPacienteResponse>(
      `${this.apiUrlPacientes}/registrar`,
      data,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Respuesta del servidor:', response);
        if (response.success) {
          console.log('🎉 Paciente registrado exitosamente');
          console.log('   Usuario ID:', response.data?.usuario_id);
          if (response.info?.contraseña_temporal) {
            console.log('   Contraseña temporal:', response.info.contraseña_temporal);
          }
        }
      }),
      catchError(error => {
        console.error('❌ Error al registrar paciente:', error);
        console.error('   Status:', error.status);
        console.error('   Message:', error.error?.message || error.message);
        console.error('   Error completo:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener todos los pacientes
   */
  obtenerPacientes(): Observable<any> {
    console.log('📋 Obteniendo lista de pacientes...');

    return this.http.get<any>(
      this.apiUrlPacientes,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Pacientes obtenidos:', response.data?.length || 0);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo pacientes:', error);
        return throwError(() => error);
      })
    );
  }
}

// ============================================
// Exportar también como RegistrarPacienteService
// para compatibilidad (alias)
// ============================================
export { AgregarPacienteMedicoService as RegistrarPacienteService };
