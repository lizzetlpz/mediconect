import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface NuevaCitaForm {
    paciente: string;
    medico: string;
    medico_id?: number;
    fecha: string;
    hora: string;
    tipoConsulta: 'Chat de Texto' | 'Videollamada';
    motivo: string;
    sintomas: string;
    tipoSangre: string;
    direccion: string;
    contactoEmergencia: string;
    telefonoEmergencia: string;
    notas: string;
}

interface CitaCreada {
    paciente: string;
    medico: string;
    medico_id?: number;
    fecha: string;
    hora: string;
    tipoConsulta: 'Chat de Texto' | 'Videollamada';
    motivo: string;
    sintomas: string;
    tipoSangre: string;
    direccion: string;
    contactoEmergencia: string;
    telefonoEmergencia: string;
    notas: string;
}

@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agendarP.component.html',
  styleUrls: ['./agendarP.component.css']
})
export class ModalCitaComponent {
  @Input() show: boolean = false;
  @Input() pacientes: string[] = [];
  @Input() medicos: string[] = [];
  @Input() medicoSeleccionado: any = null;

  @Output() close = new EventEmitter<void>();
  @Output() citaCreada = new EventEmitter<CitaCreada>();

  nuevaCita: NuevaCitaForm = {
    paciente: '',
    medico: '',
    medico_id: undefined,
    fecha: '',
    hora: '',
    tipoConsulta: 'Chat de Texto',
    motivo: '',
    sintomas: '',
    tipoSangre: '',
    direccion: '',
    contactoEmergencia: '',
    telefonoEmergencia: '',
    notas: ''
  };

  constructor() {}

  ngOnInit(): void {
    if (this.medicoSeleccionado) {
      this.nuevaCita.medico = this.medicoSeleccionado.nombre || '';
      this.nuevaCita.medico_id = this.medicoSeleccionado.id || this.medicoSeleccionado.usuario_id;
    }
  }

  closeModal(): void {
    console.log('Cerrando modal...');
    this.close.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.nuevaCita = {
      paciente: '',
      medico: '',
      medico_id: undefined,
      fecha: '',
      hora: '',
      tipoConsulta: 'Chat de Texto',
      motivo: '',
      sintomas: '',
      tipoSangre: '',
      direccion: '',
      contactoEmergencia: '',
      telefonoEmergencia: '',
      notas: ''
    };
  }

  crearCita(): void {
    // Validación básica
    if (!this.nuevaCita.paciente || !this.nuevaCita.medico || !this.nuevaCita.fecha ||
        !this.nuevaCita.hora || !this.nuevaCita.motivo) {
      alert('Por favor completa todos los campos obligatorios (*)');
      return;
    }

    // Emitir evento con los datos de la cita
    this.citaCreada.emit({ ...this.nuevaCita });

    // Cerrar modal y resetear formulario
    this.closeModal();
  }

  onOverlayClick(event: MouseEvent): void {
    // Solo cerrar si el click es directamente en el overlay, no en el contenido
    if (event.target === event.currentTarget) {
      console.log('Click en overlay');
      this.closeModal();
    }
  }
}
