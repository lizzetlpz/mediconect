// src/app/services/historialM.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface HistorialMedico {
  historial_id?: number;
  paciente_id: number;
  doctor_id?: number;
  fecha_consulta: string;
  motivo_consulta: string;
  sintomas?: string;
  diagnostico?: string;
  plan_tratamiento?: string;
  requiere_seguimiento?: boolean;
  notas_medico?: string;
  medicamentos?: Medicamento[];
  estudios?: Estudio[];
  creado_en?: string;
  actualizado_en?: string;
  paciente_nombre?: string;
  paciente_apellido_paterno?: string;
  doctor_nombre?: string;
  doctor_apellido_paterno?: string;
}

export interface Medicamento {
  medicamento_id?: number;
  historial_id?: number;
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  instrucciones?: string;
}

export interface Estudio {
  estudio_id?: number;
  historial_id?: number;
  nombre: string;
  tipo?: string;
  descripcion?: string;
  archivo_url?: string;
  creado_en?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private apiUrl = environment.apiUrl + '/historial';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  crearHistorial(data: HistorialMedico): Observable<any> {
    console.log('📤 Creando historial:', data);
    return this.http.post(this.apiUrl, data, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('✅ Historial creado:', response)),
      catchError(error => {
        console.error('❌ Error creando historial:', error);
        return throwError(() => error);
      })
    );
  }

  obtenerHistorialPaciente(paciente_id: number): Observable<HistorialMedico[]> {
    console.log('📋 Obteniendo historial del paciente:', paciente_id);
    return this.http.get<HistorialMedico[]>(
      `${this.apiUrl}/paciente/${paciente_id}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(historial => console.log('✅ Historial obtenido:', historial)),
      catchError(error => {
        console.error('❌ Error obteniendo historial:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ NUEVA FUNCIÓN: Obtener todos los historiales de un doctor
  obtenerHistorialesDoctor(doctor_id: number): Observable<HistorialMedico[]> {
    console.log('📋 Obteniendo historiales del doctor:', doctor_id);
    return this.http.get<HistorialMedico[]>(
      `${this.apiUrl}/doctor/${doctor_id}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(historiales => {
        console.log('✅ Historiales del doctor obtenidos:', historiales);
        console.log('📊 Cantidad:', historiales.length);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo historiales del doctor:', error);
        return throwError(() => error);
      })
    );
  }

  obtenerHistorialPorId(historial_id: number): Observable<HistorialMedico> {
    console.log('📋 Obteniendo historial ID:', historial_id);
    return this.http.get<HistorialMedico>(
      `${this.apiUrl}/${historial_id}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(historial => console.log('✅ Historial obtenido:', historial)),
      catchError(error => {
        console.error('❌ Error obteniendo historial:', error);
        return throwError(() => error);
      })
    );
  }

  actualizarHistorial(historial_id: number, data: Partial<HistorialMedico>): Observable<any> {
    console.log('📤 Actualizando historial:', historial_id, data);
    return this.http.put(
      `${this.apiUrl}/${historial_id}`,
      data,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Historial actualizado:', response)),
      catchError(error => {
        console.error('❌ Error actualizando historial:', error);
        return throwError(() => error);
      })
    );
  }

  eliminarHistorial(historial_id: number): Observable<any> {
    console.log('🗑️ Eliminando historial:', historial_id);
    return this.http.delete(
      `${this.apiUrl}/${historial_id}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Historial eliminado:', response)),
      catchError(error => {
        console.error('❌ Error eliminando historial:', error);
        return throwError(() => error);
      })
    );
  }
}
