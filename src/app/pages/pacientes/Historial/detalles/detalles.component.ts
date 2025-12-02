import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RegistroMedico {
  id: string;
  titulo: string;
  paciente: string;
  medico: string;
  fecha: Date;
  sintomas: string;
  diagnostico: string;
  planTratamiento: string;
  medicamentos: Medicamento[];
  fechaSeguimiento: Date;
  notasMedico: string;
  fotoReceta?: string;
  estudios?: Estudio[];
}

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones: string;
}

export interface Estudio {
  nombre: string;
  tipo?: string;
  descripcion?: string;
}

@Component({
  selector: 'app-detalles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalles.component.html',
  styleUrls: ['./detalles.component.css']
})
export class detallesComponent {
  @Input() registro: RegistroMedico | null = null;  // Agregar @Input()
  esVisible = false;

  // Datos de ejemplo
  registroEjemplo: RegistroMedico = {
    id: '1',
    titulo: 'Dolor de cabeza recurrente',
    paciente: 'Juan Pérez',
    medico: 'Dr. García',
    fecha: new Date(2024, 11, 14),
    sintomas: 'Cefalea tensional, dolor en región temporal',
    diagnostico: 'Cefalea tensional por estrés',
    planTratamiento: 'Relajación, hidratación adecuada, paracetamol según necesidad',
    medicamentos: [
      {
        nombre: 'Paracetamol',
        dosis: '500mg',
        frecuencia: 'Cada 8 horas',
        duracion: '5 días',
        instrucciones: 'Solo si hay dolor, con alimentos'
      }
    ],
    fechaSeguimiento: new Date(2024, 11, 29),
    notasMedico: 'Paciente presenta síntomas de estrés laboral. Recomendar técnicas de relajación.'
  };

  abrir(registro?: RegistroMedico) {
    this.registro = registro || this.registroEjemplo;
    this.esVisible = true;
  }

  cerrar() {
    this.esVisible = false;
    this.registro = null;
  }

  descargarFoto(): void {
    if (!this.registroActual.fotoReceta) {
      return;
    }

    // Construir URL completa si es una ruta relativa
    let fotoUrl = this.registroActual.fotoReceta;
    if (!fotoUrl.startsWith('http')) {
      fotoUrl = `http://localhost:3000${fotoUrl}`;
    }

    // Usar fetch para descargar con CORS
    fetch(fotoUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receta-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Error al descargar la imagen:', error);
        alert('Error al descargar la imagen');
      });
  }

  formatearFecha(fecha: Date): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  }

  get registroActual(): RegistroMedico {
    return this.registro!;
  }

  handleImageError(event: any): void {
    console.error('Error al cargar la imagen:', event);
    event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
  }
}
