import { Component } from '@angular/core';
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
}

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones: string;
}

@Component({
  selector: 'app-medical-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modaldeta.component.html',
  styleUrls: ['./modaldeta.component.css']
})
export class MedicalDetailComponent {
  registro: RegistroMedico | null = null;
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

  formatearFecha(fecha: Date): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  }

  get registroActual(): RegistroMedico {
    return this.registro!;
  }
}
