import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PagoBackend {
  pago_id: number;
  paciente_id: number;
  medico_id?: number;
  factura_id?: string;
  cita_id?: number;
  monto: number | string;
  metodo?: string;
  transaccion?: string;
  estado?: string;
  descripcion?: string;
  fecha?: string;
  creado_en?: string;
  paciente_nombre?: string;
  medico_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagosService {
  private api = 'http://localhost:3000/api/pagos';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  getPagos(): Observable<PagoBackend[]> {
    return this.http.get<PagoBackend[]>(this.api, { 
      headers: this.getHeaders() 
    });
  }

  getPagosByPaciente(pacienteId: number): Observable<PagoBackend[]> {
    return this.http.get<PagoBackend[]>(`${this.api}/paciente/${pacienteId}`, { 
      headers: this.getHeaders() 
    });
  }

  getPago(pagoId: number): Observable<PagoBackend> {
    return this.http.get<PagoBackend>(`${this.api}/${pagoId}`, { 
      headers: this.getHeaders() 
    });
  }

  createPago(payload: Partial<PagoBackend>) {
    return this.http.post(this.api, payload, { 
      headers: this.getHeaders() 
    });
  }

  updatePago(pagoId: number, payload: Partial<PagoBackend>) {
    return this.http.put(`${this.api}/${pagoId}`, payload, { 
      headers: this.getHeaders() 
    });
  }

  deletePago(pagoId: number) {
    return this.http.delete(`${this.api}/${pagoId}`, { 
      headers: this.getHeaders() 
    });
  }
}
