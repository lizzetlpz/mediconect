import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DoctorItem {
  usuario_id: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email?: string;
  telefono?: string;
}

export interface DoctorProfile {
  usuario_id: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email?: string;
  telefono?: string;
  especialidad?: string;
  anos_experiencia?: number;
  universidad?: string;
  cedula_profesional?: string;
  descripcion?: string;
  tarifa_consulta?: string;
}

@Injectable({ providedIn: 'root' })
export class DoctorsService {
  private api = environment.apiUrl + '/medicos';

  constructor(private http: HttpClient) {}

  listDoctors(): Observable<DoctorItem[]> {
    return this.http.get<DoctorItem[]>(this.api);
  }

  getDoctorProfile(doctorId: number): Observable<DoctorProfile> {
    return this.http.get<DoctorProfile>(`${this.api}/${doctorId}`);
  }

  // Obtener todos los médicos con sus perfiles completos
  getAllDoctorsWithProfiles(): Observable<DoctorProfile[]> {
    return this.http.get<DoctorProfile[]>(`${this.api}/profiles`);
  }
}
