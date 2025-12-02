import { Component, Input, Output, EventEmitter, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalPagoComponent } from '../pagos/pagos.component'; // Agregar import
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';

export interface Doctor {
  id: string;
  nombre: string;
  especialidad: string;
  descripcion: string;
  precio: number;
  foto?: string;
  tarifa_consulta?: number;
}

export interface CitaMedica {
  doctorId: string;
  doctorNombre: string;
  tipoConsulta: 'texto' | 'video';
  fecha: string;
  hora: string;
  motivoConsulta: string;
  sintomas?: string;
  notasAdicionales?: string;
  montoFinal?: number;
}

@Component({
  selector: 'app-agendar-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalPagoComponent], // Agregar ModalPagoComponent
  templateUrl: './modalAgendar.component.html',
  styleUrls: ['./modalAgendar.component.css']
})
export class AgendarCitaModalComponent implements OnInit {
  @Input() doctor!: Doctor;
  @Input() isOpen: boolean = false;
  @Output() citaAgendada = new EventEmitter<CitaMedica>(); // Cambiado de confirmarCita a citaAgendada
  @Output() close = new EventEmitter<void>();
  @ViewChild(ModalPagoComponent, { static: false }) modalPago!: ModalPagoComponent; // Agregar

  tipoConsulta: 'texto' | 'video' = 'texto';
  fecha: string = '';
  hora: string = '';
  motivoConsulta: string = '';
  sintomas: string = '';
  notasAdicionales: string = '';
  horariosDisponibles: string[] = [];
  citaActual: CitaMedica | null = null; // Agregar para guardar la cita
  cargandoTarifa = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarTarifaMedico();
  }

  private cargarTarifaMedico(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.cargandoTarifa = true;
    this.http.get<any>(`http://localhost:3000/api/medicos/${this.doctor.id}`, { headers }).subscribe({
      next: (perfil) => {
        console.log('📋 Perfil del médico obtenido:', perfil);
        if (perfil.tarifa_consulta) {
          this.doctor.precio = perfil.tarifa_consulta;
          console.log('💰 Tarifa actualizada:', this.doctor.precio);
        }
        this.cargandoTarifa = false;
      },
      error: (error) => {
        console.error('Error cargando tarifa:', error);
        this.cargandoTarifa = false;
        // Usar precio por defecto si hay error
        if (!this.doctor.precio || this.doctor.precio === 0) {
          this.doctor.precio = 50;
        }
      }
    });
  }

  abrir(): void {
    this.isOpen = true;
    this.limpiarFormulario();
    this.cargarTarifaMedico();
  }

  cerrar(): void {
    this.isOpen = false;
    this.limpiarFormulario();
    this.close.emit();
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  onFechaChange(fecha: string): void {
    this.fecha = fecha;
    this.cargarHorariosDisponibles(fecha);
  }

  cargarHorariosDisponibles(fecha: string): void {
    this.horariosDisponibles = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];
  }

  seleccionarTipoConsulta(tipo: 'texto' | 'video'): void {
    this.tipoConsulta = tipo;
  }

  onCancelar(): void {
    this.cerrar();
  }

  onConfirmar(): void {
    if (this.validarFormulario()) {
      const cita: CitaMedica = {
        doctorId: this.doctor.id,
        doctorNombre: this.doctor.nombre,
        tipoConsulta: this.tipoConsulta,
        fecha: this.fecha,
        hora: this.hora,
        motivoConsulta: this.motivoConsulta,
        sintomas: this.sintomas || undefined,
        notasAdicionales: this.notasAdicionales || undefined,
        montoFinal: Number(this.doctor.precio) || 50
      };

      // Guardar la cita actual
      this.citaActual = cita;

      // Cerrar el modal de agendar cita
      this.isOpen = false;

      // Verificar que el precio es válido
      const precioFinal = Number(this.doctor.precio) || 50; // Precio por defecto de 50 si no hay
      console.log('💰 Precio de cita:', this.doctor.precio, '=> Monto final:', precioFinal);

      // Abrir el modal de pago después de un pequeño delay
      setTimeout(() => {
        if (this.modalPago) {
          this.modalPago.abrir(precioFinal, cita);
        }
      }, 300);
    }
  }

  onPagoCompletado(datosPago: any): void {
    console.log('Pago completado:', datosPago);
    console.log('Cita confirmada:', this.citaActual);

    // Emitir la cita agendada al componente padre
    if (this.citaActual) {
      this.citaAgendada.emit(this.citaActual);
    }

    // Limpiar
    this.citaActual = null;
    this.cerrar();
  }

  onPagoCancelado(): void {
    console.log('Pago cancelado');
    // Volver a abrir el modal de agendar cita
    this.isOpen = true;
    this.citaActual = null;
  }

  validarFormulario(): boolean {
    return !!(this.fecha && this.hora && this.motivoConsulta.trim());
  }

  limpiarFormulario(): void {
    this.tipoConsulta = 'texto';
    this.fecha = '';
    this.hora = '';
    this.motivoConsulta = '';
    this.sintomas = '';
    this.notasAdicionales = '';
    this.horariosDisponibles = [];
  }

  get formularioValido(): boolean {
    return this.validarFormulario();
  }
}
