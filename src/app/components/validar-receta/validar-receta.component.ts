import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecetaService } from '../../services/receta.service';
import { ValidacionReceta, Receta } from '../../models/receta.model';

@Component({
  selector: 'app-validar-receta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './validar-receta.component.html',
  styleUrls: ['./validar-receta.component.css']
})
export class ValidarRecetaComponent {
  codigoValidacion = '';
  cargando = false;
  recetaValidada: Receta | null = null;
  esValida = false;
  mensajeValidacion = '';
  mostrarFormularioFarmacia = false;
  
  farmaciaInfo = {
    nombre_farmacia: '',
    farmaceutico_responsable: '',
    observaciones: ''
  };

  constructor(private recetaService: RecetaService) {}

  validarReceta(): void {
    if (!this.codigoValidacion.trim()) {
      alert('Por favor ingrese un código de validación');
      return;
    }

    this.cargando = true;
    this.resetearValidacion();

    this.recetaService.validarReceta(this.codigoValidacion.trim()).subscribe({
      next: (resultado: ValidacionReceta) => {
        this.procesarResultadoValidacion(resultado);
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error validando receta:', error);
        this.mensajeValidacion = 'Error al validar la receta. Verifique el código e intente nuevamente.';
        this.esValida = false;
        this.cargando = false;
      }
    });
  }

  private procesarResultadoValidacion(resultado: ValidacionReceta): void {
    this.esValida = resultado.valida;
    
    if (resultado.valida && resultado.receta) {
      this.recetaValidada = resultado.receta;
      this.mensajeValidacion = '✅ Receta válida y disponible para dispensar';
      this.mostrarFormularioFarmacia = true;
    } else {
      this.mensajeValidacion = resultado.razon_invalidez || '❌ Receta no válida';
      this.recetaValidada = null;
      this.mostrarFormularioFarmacia = false;
    }
  }

  utilizarReceta(): void {
    if (!this.recetaValidada || !this.farmaciaInfo.nombre_farmacia.trim() || !this.farmaciaInfo.farmaceutico_responsable.trim()) {
      alert('Por favor complete la información de la farmacia');
      return;
    }

    this.cargando = true;

    this.recetaService.utilizarReceta(this.codigoValidacion, this.farmaciaInfo).subscribe({
      next: () => {
        alert('✅ Receta dispensada exitosamente');
        this.resetearFormulario();
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error dispensando receta:', error);
        alert('❌ Error al dispensar la receta. Intente nuevamente.');
        this.cargando = false;
      }
    });
  }

  private resetearValidacion(): void {
    this.recetaValidada = null;
    this.esValida = false;
    this.mensajeValidacion = '';
    this.mostrarFormularioFarmacia = false;
  }

  resetearFormulario(): void {
    this.codigoValidacion = '';
    this.farmaciaInfo = {
      nombre_farmacia: '',
      farmaceutico_responsable: '',
      observaciones: ''
    };
    this.resetearValidacion();
  }

  // Formatear fecha para mostrar
  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'No especificada';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Verificar si la receta está por vencer
  estaPorVencer(receta: Receta): boolean {
    const ahora = new Date();
    const vencimiento = new Date(receta.fecha_vencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 7 && diasRestantes > 0;
  }

  // Obtener días restantes hasta el vencimiento
  getDiasRestantes(receta: Receta): number {
    const ahora = new Date();
    const vencimiento = new Date(receta.fecha_vencimiento);
    return Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
  }
}