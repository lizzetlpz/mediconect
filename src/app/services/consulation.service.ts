import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Consultation } from '../models/consulation.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {
  private apiUrl = environment.apiUrl;
  private consultationsSubject = new BehaviorSubject<Consultation[]>([]);
  public consultations$ = this.consultationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtener todas las consultas del usuario actual
  getConsultations(): Observable<Consultation[]> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      return of([]); // ✅ Usar 'of' en lugar de crear Observable manualmente
    }

    let endpoint = '';

    // Según el rol, obtener consultas específicas
    if (currentUser.rol_id === 3) {
      // Doctor: obtener sus consultas
      endpoint = `${this.apiUrl}/consultas/doctor/${currentUser.id}`;
    } else if (currentUser.rol_id === 2) {
      // Paciente: obtener sus consultas
      endpoint = `${this.apiUrl}/consultas/paciente/${currentUser.id}`;
    } else {
      // Admin: obtener todas
      endpoint = `${this.apiUrl}/consultas`;
    }

    console.log('📋 Obteniendo consultas desde:', endpoint);

    return this.http.get<Consultation[]>(endpoint).pipe(
      tap(consultations => {
        console.log('✅ Consultas obtenidas:', consultations);
        this.consultationsSubject.next(consultations);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo consultas:', error);
        return of([]); // ✅ Retornar array vacío tipado correctamente
      })
    );
  }

  // Obtener consulta por ID
  getConsultationById(id: string): Observable<Consultation> {
    console.log('📋 Obteniendo consulta ID:', id);

    return this.http.get<Consultation>(`${this.apiUrl}/consultas/${id}`).pipe(
      tap(consultation => {
        console.log('✅ Consulta obtenida:', consultation);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo consulta:', error);
        return throwError(() => error); // ✅ Usar throwError correctamente
      })
    );
  }

  // Crear nueva consulta
  createConsultation(data: Partial<Consultation>): Observable<any> {
    console.log('📤 Creando consulta:', data);

    return this.http.post(`${this.apiUrl}/consultas`, data).pipe(
      tap(response => {
        console.log('✅ Consulta creada:', response);
        // Recargar la lista de consultas
        this.getConsultations().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error creando consulta:', error);
        return throwError(() => error); // ✅ Usar throwError
      })
    );
  }

  // Actualizar consulta existente
  updateConsultation(id: string, data: Partial<Consultation>): Observable<any> {
    console.log('📤 Actualizando consulta:', id, data);

    return this.http.put(`${this.apiUrl}/consultas/${id}`, data).pipe(
      tap(response => {
        console.log('✅ Consulta actualizada:', response);
        // Recargar la lista de consultas
        this.getConsultations().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error actualizando consulta:', error);
        return throwError(() => error); // ✅ Usar throwError
      })
    );
  }

  // Eliminar consulta
  deleteConsultation(id: string): Observable<any> {
    console.log('🗑️ Eliminando consulta:', id);

    return this.http.delete(`${this.apiUrl}/consultas/${id}`).pipe(
      tap(response => {
        console.log('✅ Consulta eliminada:', response);
        // Recargar la lista de consultas
        this.getConsultations().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error eliminando consulta:', error);
        return throwError(() => error); // ✅ Usar throwError
      })
    );
  }

  // Obtener consultas por doctor
  getConsultationsByDoctor(doctorId: number): Observable<Consultation[]> {
    console.log('📋 Obteniendo consultas del doctor:', doctorId);

    return this.http.get<Consultation[]>(`${this.apiUrl}/consultas/doctor/${doctorId}`).pipe(
      tap(consultations => {
        console.log('✅ Consultas del doctor obtenidas:', consultations);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo consultas del doctor:', error);
        return of([]); // ✅ Retornar array vacío tipado
      })
    );
  }

  // Obtener consultas por paciente
  getConsultationsByPatient(patientId: number): Observable<Consultation[]> {
    console.log('📋 Obteniendo consultas del paciente:', patientId);

    return this.http.get<Consultation[]>(`${this.apiUrl}/consultas/paciente/${patientId}`).pipe(
      tap(consultations => {
        console.log('✅ Consultas del paciente obtenidas:', consultations);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo consultas del paciente:', error);
        return of([]); // ✅ Retornar array vacío tipado
      })
    );
  }

  // Cambiar estado de consulta
  updateConsultationStatus(id: string, estado: string): Observable<any> {
    console.log('📤 Cambiando estado de consulta:', id, estado);

    return this.http.put(`${this.apiUrl}/consultas/${id}`, { estado }).pipe(
      tap(response => {
        console.log('✅ Estado actualizado:', response);
        this.getConsultations().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error actualizando estado:', error);
        return throwError(() => error); // ✅ Usar throwError
      })
    );
  }
}
