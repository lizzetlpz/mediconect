import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Receta, Medicamento, ValidacionReceta } from '../models/receta.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecetaService {
  private apiUrl = environment.apiUrl + '/recetas';
  private recetasSubject = new BehaviorSubject<Receta[]>([]);
  public recetas$ = this.recetasSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ============== GESTIÓN DE RECETAS ==============

  // Crear nueva receta (solo médicos)
  crearReceta(recetaData: {
    paciente_id: number;
    cita_id?: number;
    medicamentos: Medicamento[];
    instrucciones: string;
    observaciones?: string;
    dias_validez?: number;
  }): Observable<Receta> {
    console.log('📝 Creando nueva receta:', recetaData);

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<Receta>(this.apiUrl, recetaData, { headers }).pipe(
      tap(receta => {
        console.log('✅ Receta creada:', receta);
        this.actualizarListaRecetas();
      }),
      catchError(error => {
        console.error('❌ Error creando receta:', error);
        throw error;
      })
    );
  }

  // Crear receta con foto (solo médicos)
  crearRecetaConFoto(formData: FormData): Observable<any> {
    console.log('📝📸 Creando receta con foto');

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // NO agregar 'Content-Type' para FormData - el navegador lo hace automáticamente
    });

    return this.http.post<any>(`${this.apiUrl}/con-foto`, formData, { headers }).pipe(
      tap(response => {
        console.log('✅ Receta con foto creada:', response);
        this.actualizarListaRecetas();
      }),
      catchError(error => {
        console.error('❌ Error creando receta con foto:', error);
        throw error;
      })
    );
  }

  // Obtener recetas del médico
  obtenerRecetasMedico(): Observable<Receta[]> {
    console.log('📋 Obteniendo recetas del médico');

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<Receta[]>(`${this.apiUrl}/medico`, { headers }).pipe(
      tap(recetas => {
        console.log('✅ Recetas del médico obtenidas:', recetas.length);
        this.recetasSubject.next(recetas);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo recetas del médico:', error);
        throw error;
      })
    );
  }

  // Obtener recetas del paciente
  obtenerRecetasPaciente(): Observable<Receta[]> {
    console.log('📋 Obteniendo recetas del paciente');

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<Receta[]>(`${this.apiUrl}/paciente`, { headers }).pipe(
      tap(recetas => {
        console.log('✅ Recetas del paciente obtenidas:', recetas.length);
        this.recetasSubject.next(recetas);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo recetas del paciente:', error);
        throw error;
      })
    );
  }

  // Validar receta por código (para farmacias)
  validarReceta(codigo: string): Observable<ValidacionReceta> {
    console.log('🔍 Validando receta con código:', codigo);

    return this.http.get<ValidacionReceta>(`${this.apiUrl}/validar/${codigo}`).pipe(
      tap(resultado => {
        console.log('✅ Resultado validación:', resultado);
      }),
      catchError(error => {
        console.error('❌ Error validando receta:', error);
        throw error;
      })
    );
  }

  // Marcar receta como utilizada (para farmacias)
  utilizarReceta(codigo: string, farmaciaInfo: {
    nombre_farmacia: string;
    farmaceutico_responsable: string;
    observaciones?: string;
  }): Observable<any> {
    console.log('💊 Marcando receta como utilizada:', codigo);

    return this.http.post(`${this.apiUrl}/utilizar/${codigo}`, farmaciaInfo).pipe(
      tap(resultado => {
        console.log('✅ Receta marcada como utilizada:', resultado);
        this.actualizarListaRecetas();
      }),
      catchError(error => {
        console.error('❌ Error utilizando receta:', error);
        throw error;
      })
    );
  }

  // Cancelar receta (solo médicos)
  cancelarReceta(recetaId: string, motivo: string): Observable<any> {
    console.log('🚫 Cancelando receta:', recetaId);

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.put(`${this.apiUrl}/${recetaId}/cancelar`, { motivo }, { headers }).pipe(
      tap(resultado => {
        console.log('✅ Receta cancelada:', resultado);
        this.actualizarListaRecetas();
      }),
      catchError(error => {
        console.error('❌ Error cancelando receta:', error);
        throw error;
      })
    );
  }

  // ============== UTILIDADES ==============

  // Generar código único de validación
  generarCodigoValidacion(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `RX-${timestamp.substr(-6)}-${random}`;
  }

  // Verificar si una receta está vencida
  estaVencida(receta: Receta): boolean {
    return new Date() > new Date(receta.fecha_vencimiento);
  }

  // Verificar si una receta puede ser utilizada
  puedeUtilizarse(receta: Receta): boolean {
    return receta.estado === 'activa' && !this.estaVencida(receta);
  }

  // Descargar receta como archivo de texto
  descargarReceta(receta: Receta): void {
    console.log('📥 Descargando receta:', receta.id);

    const contenidoReceta = this.generarTextoReceta(receta);
    const blob = new Blob([contenidoReceta], { type: 'text/plain;charset=utf-8' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receta-${receta.codigo_validacion}.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    console.log('✅ Receta descargada exitosamente');
  }

  // Generar texto de la receta para descarga
  private generarTextoReceta(receta: Receta): string {
    let contenido = `RECETA MÉDICA ELECTRÓNICA
========================================
Código de Validación: ${receta.codigo_validacion}
Fecha de Emisión: ${new Date(receta.fecha_emision).toLocaleDateString('es-ES')}
Válida hasta: ${new Date(receta.fecha_vencimiento).toLocaleDateString('es-ES')}
Estado: ${receta.estado.toUpperCase()}

INFORMACIÓN DEL PACIENTE:
----------------------------------------
Paciente: ${receta.paciente_nombre || 'N/A'}
ID: ${receta.paciente_id}

INFORMACIÓN DEL MÉDICO:
----------------------------------------
Médico: ${receta.medico_nombre || 'N/A'}
ID: ${receta.medico_id}

MEDICAMENTOS PRESCRITOS:
----------------------------------------\n`;

    receta.medicamentos.forEach((med, index) => {
      contenido += `${index + 1}. ${med.nombre} ${med.concentracion}
   Forma: ${med.forma_farmaceutica}
   Cantidad: ${med.cantidad}
   Vía: ${med.via_administracion}
   Frecuencia: ${med.frecuencia}
   Duración: ${med.duracion}`;

      if (med.indicaciones_especiales) {
        contenido += `\n   Indicaciones: ${med.indicaciones_especiales}`;
      }
      contenido += '\n\n';
    });

    contenido += `INSTRUCCIONES GENERALES:
----------------------------------------
${receta.instrucciones}\n\n`;

    if (receta.observaciones) {
      contenido += `OBSERVACIONES:
----------------------------------------
${receta.observaciones}\n\n`;
    }

    contenido += `IMPORTANTE:
----------------------------------------
- Esta receta es válida solo una vez
- Código de validación requerido en farmacia
- No válida después de la fecha de vencimiento
- Consulte a su médico ante cualquier duda

========================================
Medicom - Sistema de Telemedicina
Receta generada electrónicamente`;

    return contenido;
  }

  // Actualizar lista de recetas
  private actualizarListaRecetas(): void {
    // Método simplificado que no depende de getUserRole
    this.obtenerRecetasMedico().subscribe({
      error: () => {
        // Si falla, intentar cargar como paciente
        this.obtenerRecetasPaciente().subscribe({
          error: (err) => console.error('Error cargando recetas:', err)
        });
      }
    });
  }
}
