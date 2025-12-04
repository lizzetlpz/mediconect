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
    console.log('📥 Descargando receta:', receta.codigo_validacion);
    this.recetaService.descargarReceta(receta);
  }

  imprimirReceta(receta: Receta): void {
    console.log('🖨️ Imprimiendo receta:', receta.codigo_validacion);
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

  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

