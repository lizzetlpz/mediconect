import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RecetaService } from '../../../services/receta.service';
import { AuthService } from '../../../services/auth.service';
import { Receta } from '../../../models/receta.model';
import { PatientSidebarComponent } from '../../../barraLateral/paciente/Barrap.component';

@Component({
  selector: 'app-recetas-paciente',
  standalone: true,
  imports: [CommonModule, PatientSidebarComponent],
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.css']
})
export class RecetasPacienteComponent implements OnInit, OnDestroy {
  recetas: Receta[] = [];
  cargando = false;
  error: string | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private recetaService: RecetaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarRecetas();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  cargarRecetas(): void {
    this.cargando = true;
    this.error = null;

    const sub = this.recetaService.obtenerRecetasPaciente().subscribe({
      next: (recetas) => {
        console.log('✅ Recetas del paciente cargadas:', recetas);
        this.recetas = recetas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error cargando recetas:', error);
        this.error = 'No se pudieron cargar las recetas. Intenta de nuevo.';
        this.cargando = false;
      }
    });

    this.subscriptions.push(sub);
  }

  descargarReceta(receta: Receta): void {
    console.log('📥 Descargando receta:', receta.receta_id);
    // Implementar descarga de PDF si tienes backend para generarlo
    alert('Función de descarga en desarrollo');
  }

  imprimirReceta(receta: Receta): void {
    console.log('🖨️ Imprimiendo receta:', receta.receta_id);
    window.print();
  }

  getEstadoClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'activa':
        return 'estado-activa';
      case 'utilizada':
        return 'estado-utilizada';
      case 'vencida':
        return 'estado-vencida';
      default:
        return 'estado-activa';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'activa':
        return '✅';
      case 'utilizada':
        return '✔️';
      case 'vencida':
        return '⏰';
      default:
        return '📋';
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  cerrarDetalles(): void {
    this.recetaSeleccionada = null;
  }

  descargarReceta(receta: Receta): void {
    // Implementar descarga de PDF
    console.log('📥 Descargando receta:', receta.receta_id);
    alert('Funcionalidad de descarga en desarrollo');
  }

  imprimirReceta(receta: Receta): void {
    // Implementar impresión
    console.log('🖨️ Imprimiendo receta:', receta.receta_id);
    window.print();
  }

  getEstadoClase(estado: string): string {
    switch (estado) {
      case 'activa':
        return 'estado-activa';
      case 'usada':
        return 'estado-usada';
      case 'vencida':
        return 'estado-vencida';
      case 'cancelada':
        return 'estado-cancelada';
      default:
        return '';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'activa':
        return '✅ Activa';
      case 'usada':
        return '✔️ Usada';
      case 'vencida':
        return '⏰ Vencida';
      case 'cancelada':
        return '❌ Cancelada';
      default:
        return estado;
    }
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
