import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CitaMedica {
  id: number;
  cita_id?: number;
  paciente_id: number;
  medico_id: number;
  fecha: string;
  fecha_cita?: string;
  fecha_formateada?: string;
  hora: string;
  hora_cita?: string;
  motivo: string;
  estado: 'pendiente' | 'confirmada' | 'en_progreso' | 'completada';
  sintomas?: string;
  notas?: string;
  modalidad: 'video' | 'texto' | 'videollamada';
  creado_en?: string;
  numero?: string;

  // Campos que pueden venir directamente de la consulta JOIN
  paciente_nombre?: string;
  paciente_apellido?: string;
  paciente_telefono?: string;
  paciente_email?: string;
  medico_nombre?: string;
  medico_apellido?: string;
  medico_especialidad?: string;

  // Objetos anidados (procesados en el frontend)
  paciente: {
    nombre: string;
    telefono?: string;
    email?: string;
  };
  medico: {
    nombre: string;
    especialidad?: string;
  };
}

export interface EstadisticasCitas {
  total: number;
  pendientes: number;
  confirmadas: number;
  completadas: number;
  en_progreso: number;
}

@Injectable({
  providedIn: 'root'
})
export class CitasService {
  private apiUrl = environment.apiUrl + '/citas';

  constructor(private http: HttpClient) {}

  // Obtener todas las citas del médico actual
  obtenerCitasMedico(): Observable<CitaMedica[]> {
    return this.http.get<CitaMedica[]>(`${this.apiUrl}`);
  }

  // Obtener todas las citas del paciente actual
  obtenerCitasPaciente(): Observable<CitaMedica[]> {
    return this.http.get<CitaMedica[]>(`${this.apiUrl}/paciente`);
  }

  // Obtener estadísticas de citas del médico
  obtenerEstadisticasMedico(): Observable<EstadisticasCitas> {
    return this.http.get<EstadisticasCitas>(`${this.apiUrl}/estadisticas`);
  }

  // Actualizar estado de una cita
  actualizarEstadoCita(citaId: number, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${citaId}/estado`, { estado });
  }

  // Eliminar una cita
  eliminarCita(citaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${citaId}`);
  }

  // Agregar notas a una cita
  agregarNotas(citaId: number, notas: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${citaId}`, { notas });
  }

  // Obtener consultas activas (citas confirmadas, en progreso o pendientes)
  obtenerConsultasActivas(): Observable<CitaMedica[]> {
    return this.http.get<CitaMedica[]>(`${this.apiUrl}`).pipe(
      map(citas => citas.filter(cita =>
        cita.estado === 'confirmada' ||
        cita.estado === 'en_progreso' ||
        cita.estado === 'pendiente'
      ))
    );
  }
}
