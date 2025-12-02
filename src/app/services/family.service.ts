import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface FamilyMemberDTO {
  familiar_id?: number;
  owner_id?: number;
  nombre: string;
  apellido_paterno?: string;
  relacion?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  tipo_sangre?: string;
  puede_agendar?: boolean;
  puede_ver_historial?: boolean;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private apiUrl = 'http://localhost:3000/api/familiares';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
  }

  getFamily(): Observable<any> {
    return this.http.get<any>(this.apiUrl, { headers: this.headers() }).pipe(
      tap(res => console.log('✅ Familia obtenida:', res)),
      catchError(err => {
        console.error('❌ Error obteniendo familia:', err);
        return throwError(() => err);
      })
    );
  }

  addFamily(member: FamilyMemberDTO): Observable<any> {
    return this.http.post<any>(this.apiUrl, member, { headers: this.headers() }).pipe(
      tap(res => console.log('✅ Familiar creado:', res)),
      catchError(err => {
        console.error('❌ Error creando familiar:', err);
        return throwError(() => err);
      })
    );
  }

  updateFamily(id: number, member: FamilyMemberDTO): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, member, { headers: this.headers() }).pipe(
      tap(res => console.log('✅ Familiar actualizado:', res)),
      catchError(err => {
        console.error('❌ Error actualizando familiar:', err);
        return throwError(() => err);
      })
    );
  }

  deleteFamily(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.headers() }).pipe(
      tap(res => console.log('✅ Familiar eliminado:', res)),
      catchError(err => {
        console.error('❌ Error eliminando familiar:', err);
        return throwError(() => err);
      })
    );
  }
}
