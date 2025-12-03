import { Injectable } from '@angular/core';
import { environment } from '../../../src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Prescription } from '../models/consulation.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {
  private apiUrl = environment.apiUrl + '/api';
  private prescriptionsSubject = new BehaviorSubject<Prescription[]>([]);
  public prescriptions$ = this.prescriptionsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtener todas las prescripciones del usuario actual
  getPrescriptions(): Observable<Prescription[]> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      return of([]);
    }

    let endpoint = '';

    if (currentUser.rol_id === 3) {
      // Doctor: obtener sus prescripciones
      endpoint = `${this.apiUrl}/prescripciones/doctor/${currentUser.id}`;
    } else if (currentUser.rol_id === 2) {
      // Paciente: obtener sus prescripciones
      endpoint = `${this.apiUrl}/prescripciones/paciente/${currentUser.id}`;
    } else {
      // Admin: obtener todas
      endpoint = `${this.apiUrl}/prescripciones`;
    }

    console.log('💊 Obteniendo prescripciones desde:', endpoint);

    return this.http.get<Prescription[]>(endpoint).pipe(
      tap(prescriptions => {
        console.log('✅ Prescripciones obtenidas:', prescriptions);
        this.prescriptionsSubject.next(prescriptions);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo prescripciones:', error);
        return of([]);
      })
    );
  }

  // Obtener prescripción por ID
  getPrescriptionById(id: string): Observable<Prescription> {
    console.log('💊 Obteniendo prescripción ID:', id);

    return this.http.get<Prescription>(`${this.apiUrl}/prescripciones/${id}`).pipe(
      tap(prescription => {
        console.log('✅ Prescripción obtenida:', prescription);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo prescripción:', error);
        return throwError(() => error);
      })
    );
  }

  // Crear nueva prescripción
  createPrescription(data: Partial<Prescription>): Observable<any> {
    console.log('📤 Creando prescripción:', data);

    return this.http.post(`${this.apiUrl}/prescripciones`, data).pipe(
      tap(response => {
        console.log('✅ Prescripción creada:', response);
        this.getPrescriptions().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error creando prescripción:', error);
        return throwError(() => error);
      })
    );
  }

  // Actualizar prescripción
  updatePrescription(id: string, data: Partial<Prescription>): Observable<any> {
    console.log('📤 Actualizando prescripción:', id, data);

    return this.http.put(`${this.apiUrl}/prescripciones/${id}`, data).pipe(
      tap(response => {
        console.log('✅ Prescripción actualizada:', response);
        this.getPrescriptions().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error actualizando prescripción:', error);
        return throwError(() => error);
      })
    );
  }

  // Eliminar prescripción
  deletePrescription(id: string): Observable<any> {
    console.log('🗑️ Eliminando prescripción:', id);

    return this.http.delete(`${this.apiUrl}/prescripciones/${id}`).pipe(
      tap(response => {
        console.log('✅ Prescripción eliminada:', response);
        this.getPrescriptions().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error eliminando prescripción:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener prescripciones por paciente
  getPrescriptionsByPatient(patientId: string): Observable<Prescription[]> {
    console.log('💊 Obteniendo prescripciones del paciente:', patientId);

    return this.http.get<Prescription[]>(`${this.apiUrl}/prescripciones/paciente/${patientId}`).pipe(
      tap(prescriptions => {
        console.log('✅ Prescripciones del paciente obtenidas:', prescriptions);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo prescripciones del paciente:', error);
        return of([]);
      })
    );
  }

  // Obtener prescripciones por consulta
  getPrescriptionsByConsultation(consultationId: string): Observable<Prescription[]> {
    console.log('💊 Obteniendo prescripciones de la consulta:', consultationId);

    return this.http.get<Prescription[]>(`${this.apiUrl}/prescripciones/consulta/${consultationId}`).pipe(
      tap(prescriptions => {
        console.log('✅ Prescripciones de la consulta obtenidas:', prescriptions);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo prescripciones de la consulta:', error);
        return of([]);
      })
    );
  }
}
