import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrarPacienteService, RegistrarPacienteRequest } from '../../../../services/AgregarPacienteMedico.service';

@Component({
  selector: 'app-registrar-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registrarP.component.html',
  styleUrls: ['./registrarP.component.css']
})
export class RegistrarPacienteComponent {
  @Output() pacienteRegistrado = new EventEmitter<any>();

  mostrarModal = false;
  isLoading = false;
  errorMessage = '';

  // Información Personal
  nombre: string = '';
  apellido_paterno: string = '';
  apellido_materno: string = '';
  email: string = '';
  telefono: string = '';
  fechaNacimiento: string = '';
  genero: string = '';
  tipoSangre: string = '';

  // Dirección
  direccion: string = '';

  // Contacto de Emergencia
  contactoEmergencia: string = '';
  telefonoEmergencia: string = '';

  // Información Médica
  alergias: string = '';
  condicionesCronicas: string = '';
  medicamentosActuales: string = '';

  // Información de Seguro
  proveedorSeguro: string = '';
  numeroPoliza: string = '';

  // Opciones
  generos = [
    { value: 'Masculino', label: 'Masculino' },
    { value: 'Femenino', label: 'Femenino' },
    { value: 'Otro', label: 'Otro' }
  ];

  tiposSangre = [
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

  constructor(
    private registrarPacienteService: RegistrarPacienteService
  ) {}

  abrir(): void {
    this.mostrarModal = true;
    this.limpiarFormulario();
  }

  cancelar(): void {
    this.mostrarModal = false;
    this.limpiarFormulario();
    this.errorMessage = '';
  }

  registrarPaciente(): void {
    console.log('📝 Iniciando registro de paciente...');

    if (!this.validarFormulario()) {
      this.errorMessage = 'Por favor completa los campos obligatorios: Nombre, Apellido Paterno, Email y Teléfono';
      alert(this.errorMessage);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Preparar datos para el backend
    const pacienteData: RegistrarPacienteRequest = {
      nombre: this.nombre.trim(),
      apellido_paterno: this.apellido_paterno.trim(),
      apellido_materno: this.apellido_materno?.trim() || undefined,
      email: this.email.trim(),
      telefono: this.telefono?.trim() || undefined,
      fecha_nacimiento: this.fechaNacimiento || undefined,
      genero: this.genero || undefined,
      tipo_sangre: this.tipoSangre || undefined,
      direccion: this.direccion?.trim() || undefined,
      contacto_emergencia_nombre: this.contactoEmergencia?.trim() || undefined,
      contacto_emergencia_telefono: this.telefonoEmergencia?.trim() || undefined,
      alergias: this.alergias?.trim() || undefined,
      condiciones_cronicas: this.condicionesCronicas?.trim() || undefined,
      medicamentos_actuales: this.medicamentosActuales?.trim() || undefined,
      proveedor_seguro: this.proveedorSeguro?.trim() || undefined,
      numero_poliza: this.numeroPoliza?.trim() || undefined
    };

    console.log('📤 Enviando datos:', pacienteData);

    // Llamar al servicio
    this.registrarPacienteService.registrarPaciente(pacienteData).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del backend:', response);
        this.isLoading = false;

        if (response.success) {
          alert('¡Paciente registrado exitosamente en la base de datos!');

          // ✅ CALCULAR EDAD
          let edad = 0;
          if (this.fechaNacimiento) {
            const hoy = new Date();
            const nacimiento = new Date(this.fechaNacimiento);
            edad = hoy.getFullYear() - nacimiento.getFullYear();
            const mes = hoy.getMonth() - nacimiento.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
              edad--;
            }
          }

          // ✅ OBTENER INICIALES
          const iniciales = (this.nombre.charAt(0) + this.apellido_paterno.charAt(0)).toUpperCase();

          // ✅ EMITIR EVENTO CON ESTRUCTURA COMPLETA
          this.pacienteRegistrado.emit({
            id: response.data?.usuario_id?.toString() || Date.now().toString(),
            usuario_id: response.data?.usuario_id,
            nombre: `${this.nombre} ${this.apellido_paterno} ${this.apellido_materno || ''}`.trim(),
            iniciales: iniciales,
            edad: edad,
            tipoSangre: this.tipoSangre || '',
            telefono: this.telefono || '',
            direccion: this.direccion || '',
            genero: this.genero as 'Masculino' | 'Femenino' | 'Otro',
            email: this.email,
            tieneAlergias: (this.alergias?.trim().length || 0) > 0,
            tieneCondicionCronica: (this.condicionesCronicas?.trim().length || 0) > 0,
            tieneSeguro: (this.proveedorSeguro?.trim().length || 0) > 0,
            contactoEmergencia: {
              nombre: this.contactoEmergencia || '',
              telefono: this.telefonoEmergencia || ''
            }
          });

          this.cancelar();
        } else {
          this.errorMessage = response.message || 'Error al registrar paciente';
          alert(this.errorMessage);
        }
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error al registrar paciente';
        alert(`Error: ${this.errorMessage}`);
      }
    });
  }

  validarFormulario(): boolean {
    // Campos obligatorios: nombre, apellido_paterno, email, telefono
    return !!(
      this.nombre.trim() &&
      this.apellido_paterno.trim() &&
      this.email.trim() &&
      this.telefono.trim()
    );
  }

  limpiarFormulario(): void {
    this.nombre = '';
    this.apellido_paterno = '';
    this.apellido_materno = '';
    this.email = '';
    this.telefono = '';
    this.fechaNacimiento = '';
    this.genero = '';
    this.tipoSangre = '';
    this.direccion = '';
    this.contactoEmergencia = '';
    this.telefonoEmergencia = '';
    this.alergias = '';
    this.condicionesCronicas = '';
    this.medicamentosActuales = '';
    this.proveedorSeguro = '';
    this.numeroPoliza = '';
    this.errorMessage = '';
    this.isLoading = false;
  }
}
