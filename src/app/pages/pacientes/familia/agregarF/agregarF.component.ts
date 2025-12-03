import { Component, ViewChild, ElementRef, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Paciente {
  id: string;
  usuario_id?: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

interface FamilyMember {
  pacienteId: string;
  nombre: string;
  apellidos: string;
  relacion: string;
  puedeAgendarCitas: boolean;
  puedeVerHistorial: boolean;
  fechaAgregado: Date;
  familiar_id?: string; // Añadido para el ID real del familiar en BD
  fechaNacimiento?: string;
  tipoSangre?: string;
  numeroCelular?: string;
  contactoEmergencia?: string;
  enfermedades?: string[];
  alergias?: string[];
  fechaRegistro?: Date;
}

@Component({
  selector: 'app-agregar-familiar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agregarF.component.html',
  styleUrls: ['./agregarF.component.css']
})
export class AgregarFamiliarComponent implements OnInit {
  @ViewChild('modalAgregar', { static: false }) modalAgregar!: ElementRef<HTMLDivElement>;
  @Output() familiarAgregado = new EventEmitter<FamilyMember>();

  // Estado del modal
  esVisible = false;
  cargando = false;

  // Búsqueda de pacientes
  textoBusqueda = '';
  pacienteFiltrados: Paciente[] = [];
  pacienteSeleccionado: Paciente | null = null;
  mostrarResultados = false;

  // Lista de pacientes (cargada desde backend)
  pacientes: Paciente[] = [];

  // Relaciones familiares
  relaciones = [
    { value: 'hijo', label: '👶 Hijo/Hija' },
    { value: 'pareja', label: '💑 Pareja' },
    { value: 'padre', label: '👨‍🦳 Padre' },
    { value: 'madre', label: '👩‍🦳 Madre' },
    { value: 'hermano', label: '👨‍🤝‍👨 Hermano/Hermana' },
    { value: 'abuelo', label: '👴 Abuelo/Abuela' },
    { value: 'tio', label: '👨‍🦱 Tío/Tía' },
    { value: 'sobrino', label: '👧 Sobrino/Sobrina' },
    { value: 'otro', label: '🤝 Otro familiar' }
  ];

  // Formulario
  relacionSeleccionada = '';
  puedeAgendarCitas = true;
  puedeVerHistorial = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('Componente AgregarFamiliar inicializado');
    this.cargarPacientes();
  }

  /**
   * Carga los pacientes desde el backend
   */
  private cargarPacientes(): void {
    console.log('📋 Cargando pacientes desde backend...');
    this.http.get<any[]>('http://localhost:3000/api/pacientes').subscribe({
      next: (res) => {
        console.log('✅ Pacientes cargados:', res);
        // Mapear a la interfaz local
        this.pacientes = (res || []).map((p: any) => ({
          id: String(p.usuario_id || p.id),
          usuario_id: p.usuario_id,
          nombre: p.nombre || '',
          apellido_paterno: p.apellido_paterno || '',
          apellido_materno: p.apellido_materno || '',
          apellido: `${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim(),
          email: p.email || '',
          telefono: p.telefono || ''
        }));
        console.log('📊 Pacientes mapeados para búsqueda:', this.pacientes);
      },
      error: (err) => {
        console.error('❌ Error cargando pacientes:', err);
        // Fallback: mostrar lista vacía
        this.pacientes = [];
      }
    });
  }

  /**
   * Abre el modal
   */
  abrir(): void {
    console.log('🔓 Abriendo modal Agregar Familiar');
    this.esVisible = true;
    this.limpiarFormulario();
    // Recargar pacientes antes de abrir
    this.cargarPacientes();
  }

  /**
   * Cierra el modal
   */
  cancelar(): void {
    this.esVisible = false;
    this.limpiarFormulario();
  }

  /**
   * Limpia el formulario
   */
  private limpiarFormulario(): void {
    this.textoBusqueda = '';
    this.pacienteSeleccionado = null;
    this.relacionSeleccionada = '';
    this.puedeAgendarCitas = true;
    this.puedeVerHistorial = true;
    this.pacienteFiltrados = [];
    this.mostrarResultados = false;
  }

  /**
   * Busca pacientes por nombre o apellido
   */
  buscarPaciente(): void {
    if (!this.textoBusqueda.trim()) {
      this.pacienteFiltrados = [];
      this.mostrarResultados = false;
      return;
    }

    const termino = this.textoBusqueda.toLowerCase();
    this.pacienteFiltrados = this.pacientes.filter(p => {
      const nombreCompleto = `${p.nombre} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.toLowerCase();
      return nombreCompleto.includes(termino) ||
             p.email?.toLowerCase().includes(termino);
    });

    this.mostrarResultados = true;
    console.log('🔍 Resultados encontrados:', this.pacienteFiltrados.length);
  }

  /**
   * Selecciona un paciente
   */
  seleccionarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
    this.textoBusqueda = `${paciente.nombre} ${paciente.apellido_paterno || ''}`.trim();
    this.mostrarResultados = false;
    this.pacienteFiltrados = [];
    console.log('✅ Paciente seleccionado:', paciente);
  }

  /**
   * Limpia la búsqueda
   */
  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.pacienteSeleccionado = null;
    this.pacienteFiltrados = [];
    this.mostrarResultados = false;
  }

  /**
   * Agrega el familiar al plan
   */
  agregarFamiliar(): void {
    // Validaciones
    if (!this.pacienteSeleccionado) {
      alert('Por favor selecciona un paciente');
      return;
    }

    if (!this.relacionSeleccionada) {
      alert('Por favor selecciona la relación familiar');
      return;
    }

    this.cargando = true;

    const familiarAgregado: FamilyMember = {
      pacienteId: this.pacienteSeleccionado.usuario_id?.toString() || this.pacienteSeleccionado.id,
      familiar_id: this.pacienteSeleccionado.usuario_id?.toString() || this.pacienteSeleccionado.id,
      nombre: this.pacienteSeleccionado.nombre,
      apellidos: `${this.pacienteSeleccionado.apellido_paterno || ''} ${this.pacienteSeleccionado.apellido_materno || ''}`.trim(),
      relacion: this.relacionSeleccionada,
      puedeAgendarCitas: this.puedeAgendarCitas,
      puedeVerHistorial: this.puedeVerHistorial,
      fechaAgregado: new Date(),
      fechaNacimiento: undefined // Se pueden agregar más campos aquí si es necesario
    };

    console.log('📤 Emitiendo familiar agregado:', familiarAgregado);
    this.familiarAgregado.emit(familiarAgregado);

    setTimeout(() => {
      this.mostrarMensajeExito();
      this.cargando = false;
      this.cancelar();
    }, 500);
  }

  /**
   * Muestra mensaje de éxito
   */
  private mostrarMensajeExito(): void {
    alert(`¡${this.pacienteSeleccionado?.nombre} ha sido agregado a tu Plan Familiar!`);
  }
}
