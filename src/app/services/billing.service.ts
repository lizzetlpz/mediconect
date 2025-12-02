import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { BillingRecord } from '../models/consulation.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private apiUrl = 'http://localhost:3000/api';
  private billingsSubject = new BehaviorSubject<BillingRecord[]>([]);
  public billings$ = this.billingsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtener todos los registros de facturación
  getBillingRecords(): Observable<BillingRecord[]> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      return of([]);
    }

    let endpoint = '';

    if (currentUser.rol_id === 3) {
      // Doctor: obtener su facturación
      endpoint = `${this.apiUrl}/facturacion/doctor/${currentUser.usuario_id}`;
    } else if (currentUser.rol_id === 2) {
      // Paciente: obtener su facturación
      endpoint = `${this.apiUrl}/facturacion/paciente/${currentUser.usuario_id}`;
    } else {
      // Admin: obtener todas
      endpoint = `${this.apiUrl}/facturacion`;
    }

    console.log('💵 Obteniendo registros de facturación desde:', endpoint);

    return this.http.get<BillingRecord[]>(endpoint).pipe(
      tap(records => {
        console.log('✅ Registros de facturación obtenidos:', records);
        this.billingsSubject.next(records);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo registros de facturación:', error);
        return of([]);
      })
    );
  }

  // Obtener registro por ID
  getBillingRecordById(id: string): Observable<BillingRecord> {
    console.log('💵 Obteniendo registro de facturación ID:', id);

    return this.http.get<BillingRecord>(`${this.apiUrl}/facturacion/${id}`).pipe(
      tap(record => {
        console.log('✅ Registro de facturación obtenido:', record);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo registro de facturación:', error);
        return throwError(() => error);
      })
    );
  }

  // Crear nuevo registro de facturación
  createBillingRecord(data: Partial<BillingRecord>): Observable<any> {
    console.log('📤 Creando registro de facturación:', data);

    return this.http.post(`${this.apiUrl}/facturacion`, data).pipe(
      tap(response => {
        console.log('✅ Registro de facturación creado:', response);
        this.getBillingRecords().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error creando registro de facturación:', error);
        return throwError(() => error);
      })
    );
  }

  // Actualizar registro de facturación
  updateBillingRecord(id: string, data: Partial<BillingRecord>): Observable<any> {
    console.log('📤 Actualizando registro de facturación:', id, data);

    return this.http.put(`${this.apiUrl}/facturacion/${id}`, data).pipe(
      tap(response => {
        console.log('✅ Registro de facturación actualizado:', response);
        this.getBillingRecords().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error actualizando registro de facturación:', error);
        return throwError(() => error);
      })
    );
  }

  // Eliminar registro de facturación
  deleteBillingRecord(id: string): Observable<any> {
    console.log('🗑️ Eliminando registro de facturación:', id);

    return this.http.delete(`${this.apiUrl}/facturacion/${id}`).pipe(
      tap(response => {
        console.log('✅ Registro de facturación eliminado:', response);
        this.getBillingRecords().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error eliminando registro de facturación:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener registros por paciente
  getBillingRecordsByPatient(patientId: string): Observable<BillingRecord[]> {
    console.log('💵 Obteniendo registros de facturación del paciente:', patientId);

    return this.http.get<BillingRecord[]>(`${this.apiUrl}/facturacion/paciente/${patientId}`).pipe(
      tap(records => {
        console.log('✅ Registros de facturación del paciente obtenidos:', records);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo registros de facturación del paciente:', error);
        return of([]);
      })
    );
  }

  // Obtener registros por estado de pago
  getBillingRecordsByStatus(status: string): Observable<BillingRecord[]> {
    console.log('💵 Obteniendo registros de facturación por estado:', status);

    return this.http.get<BillingRecord[]>(`${this.apiUrl}/facturacion/estado/${status}`).pipe(
      tap(records => {
        console.log('✅ Registros de facturación por estado obtenidos:', records);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo registros de facturación por estado:', error);
        return of([]);
      })
    );
  }
}
