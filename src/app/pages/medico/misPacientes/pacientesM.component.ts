import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrarPacienteComponent } from './registrarP/registrarP.component';
import { AgregarPacienteMedicoService } from '../../../services/AgregarPacienteMedico.service';
import { DoctorSidebarComponent } from '../../../barraLateral/doctor/BarraD.component';

interface Paciente {
  id: string;
  usuario_id: number;
  nombre: string;
  iniciales: string;
  edad: number;
  tipoSangre: string;
  telefono: string;
  direccion?: string;
  genero?: string;
  email: string;
  tieneAlergias: boolean;
  tieneCondicionCronica: boolean;
  tieneSeguro: boolean;
  contactoEmergencia?: {
    nombre: string;
    telefono: string;
  };
}

@Component({
  selector: 'app-gestion-pacientes',
  standalone: true,
  imports: [CommonModule, RegistrarPacienteComponent, DoctorSidebarComponent],
  templateUrl: './pacientesM.component.html',
  styleUrls: ['./pacientesM.component.css']
})
export class GestionPacientesComponent implements OnInit {
  @ViewChild(RegistrarPacienteComponent) registrarPacienteModal!: RegistrarPacienteComponent;

  pacientes: Paciente[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  // Estadísticas
  totalPacientes: number = 0;
  pacientesConAlergias: number = 0;
  pacientesConCondicionesCronicas: number = 0;
  pacientesConSeguro: number = 0;

  constructor(
    private agregarPacienteService: AgregarPacienteMedicoService
  ) {}

  ngOnInit(): void {
    this.cargarPacientes();
  }

  /**
   * Cargar pacientes desde la base de datos
   */
  cargarPacientes(): void {
    console.log('📋 Cargando pacientes desde la BD...');
    this.isLoading = true;
    this.errorMessage = '';

    this.agregarPacienteService.obtenerPacientes().subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);

        if (response.success && response.data) {
          // Transformar datos de la BD al formato del frontend
          this.pacientes = response.data.map((p: any) => this.transformarPaciente(p));

          // Calcular estadísticas
          this.calcularEstadisticas();

          console.log(`✅ ${this.pacientes.length} pacientes cargados`);
          this.isLoading = false;
        } else {
          this.errorMessage = 'No se pudieron cargar los pacientes';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('❌ Error cargando pacientes:', error);
        this.errorMessage = 'Error al cargar pacientes';
        this.isLoading = false;
      }
    });
  }

  /**
   * Transformar datos de la BD al formato del frontend
   */
  private transformarPaciente(pacienteDB: any): Paciente {
    // Calcular edad si hay fecha de nacimiento
    let edad = 0;
    if (pacienteDB.fecha_nacimiento) {
      const hoy = new Date();
      const nacimiento = new Date(pacienteDB.fecha_nacimiento);
      edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
    }

    // Obtener iniciales
    const nombre = pacienteDB.nombre || '';
    const apellidoPaterno = pacienteDB.apellido_paterno || '';
    const iniciales = (nombre.charAt(0) + apellidoPaterno.charAt(0)).toUpperCase();

    return {
      id: pacienteDB.usuario_id?.toString() || '',
      usuario_id: pacienteDB.usuario_id,
      nombre: pacienteDB.nombre_completo || `${nombre} ${apellidoPaterno}`,
      iniciales: iniciales,
      edad: edad,
      tipoSangre: pacienteDB.tipo_sangre || '',
      telefono: pacienteDB.telefono || '',
      direccion: pacienteDB.direccion || '',
      genero: pacienteDB.genero || '',
      email: pacienteDB.email || '',
      tieneAlergias: !!(pacienteDB.alergias && pacienteDB.alergias.trim().length > 0),
      tieneCondicionCronica: !!(pacienteDB.condiciones_cronicas && pacienteDB.condiciones_cronicas.trim().length > 0),
      tieneSeguro: false, // Puedes agregar esta info si la tienes en la BD
      contactoEmergencia: {
        nombre: '',
        telefono: ''
      }
    };
  }

  /**
   * Calcular estadísticas
   */
  private calcularEstadisticas(): void {
    this.totalPacientes = this.pacientes.length;
    this.pacientesConAlergias = this.pacientes.filter(p => p.tieneAlergias).length;
    this.pacientesConCondicionesCronicas = this.pacientes.filter(p => p.tieneCondicionCronica).length;
    this.pacientesConSeguro = this.pacientes.filter(p => p.tieneSeguro).length;
  }

  /**
   * Abrir modal de registro
   */
  abrirModalRegistro(): void {
    this.registrarPacienteModal.abrir();
  }

  /**
   * Manejar evento cuando se registra un nuevo paciente
   */
  onPacienteRegistrado(paciente: Paciente): void {
    console.log('✅ Paciente registrado:', paciente);

    // Agregar el nuevo paciente a la lista
    this.pacientes.unshift(paciente);

    // Recalcular estadísticas
    this.calcularEstadisticas();

    console.log(`📊 Total pacientes: ${this.totalPacientes}`);
  }

  /**
   * Buscar pacientes
   */
  buscarPacientes(termino: string): void {
    if (!termino || termino.trim() === '') {
      this.cargarPacientes();
      return;
    }

    const terminoLower = termino.toLowerCase();
    this.pacientes = this.pacientes.filter(p =>
      p.nombre.toLowerCase().includes(terminoLower) ||
      p.telefono.includes(termino) ||
      p.email.toLowerCase().includes(terminoLower)
    );
  }
}
