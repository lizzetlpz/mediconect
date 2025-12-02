import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MedicalTest } from '../models/consulation.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MedicalTestService {
  private apiUrl = 'http://localhost:3000/api';
  private testsSubject = new BehaviorSubject<MedicalTest[]>([]);
  public tests$ = this.testsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtener todas las pruebas médicas
  getMedicalTests(): Observable<MedicalTest[]> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      return of([]);
    }

    let endpoint = '';

    if (currentUser.rol_id === 3) {
      // Doctor: obtener sus pruebas
      endpoint = `${this.apiUrl}/pruebas-medicas/doctor/${currentUser.usuario_id}`;
    } else if (currentUser.rol_id === 2) {
      // Paciente: obtener sus pruebas
      endpoint = `${this.apiUrl}/pruebas-medicas/paciente/${currentUser.usuario_id}`;
    } else {
      // Admin: obtener todas
      endpoint = `${this.apiUrl}/pruebas-medicas`;
    }

    console.log('🔬 Obteniendo pruebas médicas desde:', endpoint);

    return this.http.get<MedicalTest[]>(endpoint).pipe(
      tap(tests => {
        console.log('✅ Pruebas médicas obtenidas:', tests);
        this.testsSubject.next(tests);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo pruebas médicas:', error);
        return of([]);
      })
    );
  }

  // Obtener prueba por ID
  getMedicalTestById(id: string): Observable<MedicalTest> {
    console.log('🔬 Obteniendo prueba médica ID:', id);

    return this.http.get<MedicalTest>(`${this.apiUrl}/pruebas-medicas/${id}`).pipe(
      tap(test => {
        console.log('✅ Prueba médica obtenida:', test);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo prueba médica:', error);
        return throwError(() => error);
      })
    );
  }

  // Crear nueva prueba médica
  createMedicalTest(data: Partial<MedicalTest>): Observable<any> {
    console.log('📤 Creando prueba médica:', data);

    return this.http.post(`${this.apiUrl}/pruebas-medicas`, data).pipe(
      tap(response => {
        console.log('✅ Prueba médica creada:', response);
        this.getMedicalTests().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error creando prueba médica:', error);
        return throwError(() => error);
      })
    );
  }

  // Actualizar prueba médica
  updateMedicalTest(id: string, data: Partial<MedicalTest>): Observable<any> {
    console.log('📤 Actualizando prueba médica:', id, data);

    return this.http.put(`${this.apiUrl}/pruebas-medicas/${id}`, data).pipe(
      tap(response => {
        console.log('✅ Prueba médica actualizada:', response);
        this.getMedicalTests().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error actualizando prueba médica:', error);
        return throwError(() => error);
      })
    );
  }

  // Eliminar prueba médica
  deleteMedicalTest(id: string): Observable<any> {
    console.log('🗑️ Eliminando prueba médica:', id);

    return this.http.delete(`${this.apiUrl}/pruebas-medicas/${id}`).pipe(
      tap(response => {
        console.log('✅ Prueba médica eliminada:', response);
        this.getMedicalTests().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error eliminando prueba médica:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener pruebas por paciente
  getMedicalTestsByPatient(patientId: string): Observable<MedicalTest[]> {
    console.log('🔬 Obteniendo pruebas médicas del paciente:', patientId);

    return this.http.get<MedicalTest[]>(`${this.apiUrl}/pruebas-medicas/paciente/${patientId}`).pipe(
      tap(tests => {
        console.log('✅ Pruebas médicas del paciente obtenidas:', tests);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo pruebas médicas del paciente:', error);
        return of([]);
      })
    );
  }
}
