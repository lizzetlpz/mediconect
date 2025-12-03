import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AgregarPacienteMedicoService,
  NuevoHistorialRequest,
  Medicamento,
  Estudio
} from '../../../../services/AgregarPacienteMedico.service';
import { AuthService } from '../../../../services/auth.service';

interface MedicamentoForm {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones: string;
}

interface EstudioForm {
  nombre: string;
  tipo: string;
  descripcion: string;
  archivo?: File;
}

@Component({
  selector: 'app-agregarR',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agregarR.component.html',
  styleUrls: ['./agregarR.component.css']
})
export class CrearRegistroComponent implements OnInit {
  @Output() cerrar = new EventEmitter<void>();
  @Output() registroCreado = new EventEmitter<void>();

  // Form data
  pacienteNombre: string = '';
  fechaConsulta: string = '';
  motivoConsulta: string = '';
  sintomas: string = '';
  diagnostico: string = '';
  planTratamiento: string = '';
  medicamentos: MedicamentoForm[] = [];
  estudios: EstudioForm[] = [];
  fotoReceta: File | null = null;
  requiereSeguimiento: boolean = false;
  notasMedico: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  doctorNombre: string = '';

  constructor(
    private agregarPacienteService: AgregarPacienteMedicoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.fechaConsulta = today.toISOString().split('T')[0];

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.doctorNombre = `Dr. ${currentUser.nombre} ${currentUser.apellido_paterno}`;
    }
  }

  agregarMedicamento(): void {
    this.medicamentos.push({
      nombre: '',
      dosis: '',
      frecuencia: '',
      duracion: '',
      instrucciones: ''
    });
  }

  eliminarMedicamento(index: number): void {
    this.medicamentos.splice(index, 1);
  }

  agregarEstudio(): void {
    this.estudios.push({
      nombre: '',
      tipo: '',
      descripcion: ''
    });
  }

  eliminarEstudio(index: number): void {
    this.estudios.splice(index, 1);
  }

  onFileSelect(event: any, type: 'receta' | 'estudio', index?: number): void {
    const file = event.target.files[0];
    if (file) {
      if (type === 'receta') {
        this.fotoReceta = file;
      } else if (type === 'estudio' && index !== undefined) {
        this.estudios[index].archivo = file;
      }
    }
  }

  cancelar(): void {
    this.cerrar.emit();
  }

  crearRegistro(): void {
    console.log('📝 Creando registro médico...');

    // Validación
    if (!this.pacienteNombre.trim() || !this.fechaConsulta || !this.motivoConsulta.trim()) {
      this.errorMessage = 'Por favor completa todos los campos obligatorios (Paciente, Fecha, Motivo)';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Preparar medicamentos
    const medicamentosAPI: Medicamento[] = this.medicamentos
      .filter(med => med.nombre.trim() !== '')
      .map(med => ({
        nombre: med.nombre,
        dosis: med.dosis,
        frecuencia: med.frecuencia,
        duracion: med.duracion,
        instrucciones: med.instrucciones
      }));

    // Preparar estudios
    const estudiosAPI: Estudio[] = this.estudios
      .filter(est => est.nombre.trim() !== '')
      .map(est => ({
        nombre: est.nombre,
        tipo: est.tipo,
        descripcion: est.descripcion,
        archivo_url: ''
      }));

    // Crear request
    const nuevoHistorial: NuevoHistorialRequest = {
      paciente_nombre: this.pacienteNombre.trim(),
      fecha_consulta: this.fechaConsulta,
      motivo_consulta: this.motivoConsulta,
      sintomas: this.sintomas,
      diagnostico: this.diagnostico,
      plan_tratamiento: this.planTratamiento,
      requiere_seguimiento: this.requiereSeguimiento,
      notas_medico: this.notasMedico,
      medicamentos: medicamentosAPI,
      estudios: estudiosAPI
    };

    console.log('📤 Enviando al backend:', nuevoHistorial);

    // Llamada al servicio
    this.agregarPacienteService.crearHistorialMedico(nuevoHistorial).subscribe({
      next: (response) => {
        console.log('✅ Respuesta:', response);
        this.isLoading = false;

        if (response.success) {
          alert('Registro médico creado exitosamente');
          this.registroCreado.emit();
          this.cerrar.emit();
        } else {
          this.errorMessage = response.message || 'Error al crear el registro';
        }
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error al crear el registro médico';
      }
    });
  }
}

