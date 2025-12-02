import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Appointment } from '../models/consulation.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = 'http://localhost:3000/api';
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtener todas las citas del usuario actual
  getAppointments(): Observable<Appointment[]> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      return of([]);
    }

    let endpoint = '';

    if (currentUser.rol_id === 3) {
      // Doctor: obtener sus citas
      endpoint = `${this.apiUrl}/citas/doctor/${currentUser.usuario_id}`;
    } else if (currentUser.rol_id === 2) {
      // Paciente: obtener sus citas
      endpoint = `${this.apiUrl}/citas/paciente/${currentUser.usuario_id}`;
    } else {
      // Admin: obtener todas
      endpoint = `${this.apiUrl}/citas`;
    }

    console.log('📅 Obteniendo citas desde:', endpoint);

    return this.http.get<Appointment[]>(endpoint).pipe(
      tap(appointments => {
        console.log('✅ Citas obtenidas:', appointments);
        this.appointmentsSubject.next(appointments);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo citas:', error);
        return of([]);
      })
    );
  }

  // Obtener cita por ID
  getAppointmentById(id: string): Observable<Appointment> {
    console.log('📅 Obteniendo cita ID:', id);

    return this.http.get<Appointment>(`${this.apiUrl}/citas/${id}`).pipe(
      tap(appointment => {
        console.log('✅ Cita obtenida:', appointment);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo cita:', error);
        return throwError(() => error);
      })
    );
  }

  // Crear nueva cita
  createAppointment(data: Partial<Appointment>): Observable<any> {
    console.log('📤 Creando cita:', data);

    return this.http.post(`${this.apiUrl}/citas`, data).pipe(
      tap((response: any) => {
        console.log('✅ Cita creada:', response);
        // Si el backend devolvió un ID, añadir una entrada temporal inmediata para UI
        try {
          const citaId = response && (response.cita_id || response.insertId || response.id);
          if (citaId) {
            const current = this.appointmentsSubject.value || [];
            const temp: any = {
              cita_id: citaId,
              paciente_id: data.paciente_id,
              medico_id: data.medico_id,
              medico_nombre: (data as any).medico_nombre || undefined,
              paciente_nombre: undefined,
              fecha_cita: data.fecha_cita,
              hora_cita: data.hora_cita,
              motivo: data.motivo,
              sintomas: (data as any).sintomas || '',
              notas: (data as any).notas || '',
              modalidad: (data as any).modalidad || 'video',
              estado: data.estado || 'pendiente'
            };
            // push temp to current list so UI shows immediately
            this.appointmentsSubject.next([temp, ...current]);
            console.log('🎯 Cita temporal añadida al BehaviorSubject:', temp);
          }
        } catch (e) {
          console.error('⚠️ Error añadiendo cita temporal:', e);
        }

        // Finalmente refrescar desde el servidor después de 500ms para asegurar que esté en la BD
        setTimeout(() => {
          console.log('🔄 Refrescando citas desde servidor...');
          this.getAppointments().subscribe();
        }, 500);
      }),
      catchError(error => {
        console.error('❌ Error creando cita:', error);
        return throwError(() => error);
      })
    );
  }

  // Actualizar cita
  updateAppointment(id: string, data: Partial<Appointment>): Observable<any> {
    console.log('📤 Actualizando cita:', id, data);

    return this.http.put(`${this.apiUrl}/citas/${id}`, data).pipe(
      tap(response => {
        console.log('✅ Cita actualizada:', response);
        this.getAppointments().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error actualizando cita:', error);
        return throwError(() => error);
      })
    );
  }

  // Eliminar cita
  deleteAppointment(id: string): Observable<any> {
    console.log('🗑️ Eliminando cita:', id);

    return this.http.delete(`${this.apiUrl}/citas/${id}`).pipe(
      tap(response => {
        console.log('✅ Cita eliminada:', response);
        this.getAppointments().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error eliminando cita:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener citas por paciente
  getAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    console.log('📅 Obteniendo citas del paciente:', patientId);

    return this.http.get<Appointment[]>(`${this.apiUrl}/citas/paciente/${patientId}`).pipe(
      tap(appointments => {
        console.log('✅ Citas del paciente obtenidas:', appointments);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo citas del paciente:', error);
        return of([]);
      })
    );
  }

  // Cambiar estado de cita
  updateAppointmentStatus(id: string, estado: string): Observable<any> {
    console.log('📤 Cambiando estado de cita:', id, estado);

    return this.http.put(`${this.apiUrl}/citas/${id}`, { estado }).pipe(
      tap(response => {
        console.log('✅ Estado actualizado:', response);
        this.getAppointments().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error actualizando estado:', error);
        return throwError(() => error);
      })
    );
  }
}
