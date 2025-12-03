import { Component, ViewChild, ElementRef, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface FamilyMember {
  pacienteId: string;
  nombre: string;
  apellidos: string;
  relacion: string;
  puedeAgendarCitas: boolean;
  puedeVerHistorial: boolean;
  fechaAgregado?: Date;
  fechaNacimiento?: string;
  tipoSangre?: string;
  numeroCelular?: string;
  contactoEmergencia?: string | null;
  enfermedades?: string[];
  alergias?: string[];
  fechaRegistro?: Date;
}

@Component({
  selector: 'app-editar-familiar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './editarF.component.html',
  styleUrls: ['./editarF.component.css']
})
export class EditarFamiliarComponent {
  @ViewChild('modalEditar', { static: false }) modalEditar!: ElementRef<HTMLDivElement>;
  @Output() familiarActualizado = new EventEmitter<FamilyMember>();

  formulario: FormGroup;
  mostrarModal = false;
  cargando = false;
  enfermedadInput = '';
  alergiaInput = '';
  enfermedadesSeleccionadas: string[] = [];
  alergiaSeleccionadas: string[] = [];
  familiarEditando: FamilyMember | null = null;

  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  tiposParentesco = [
    'Padre',
    'Madre',
    'Hijo/a',
    'Hermano/a',
    'Abuelo/a',
    'Nieto/a',
    'Tío/a',
    'Sobrino/a',
    'Primo/a',
    'Esposo/a',
    'Cónyuge',
    'Pareja',
    'Suegro/a',
    'Yerno/Nuera',
    'Cuñado/a',
    'Otro'
  ];

  constructor(private fb: FormBuilder) {
    this.formulario = this.crearFormulario();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      fechaNacimiento: ['', [Validators.required, this.validarEdad.bind(this)]],
      tipoSangre: ['', Validators.required],
      parentesco: ['', Validators.required],
      numeroCelular: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
      contactoEmergencia: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
    });
  }

  private validarEdad(control: any): { [key: string]: any } | null {
    if (!control.value) return null;

    const fecha = new Date(control.value);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mes = hoy.getMonth() - fecha.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }

    if (edad < 0 || edad > 130) {
      return { edadInvalida: true };
    }

    return null;
  }

  abrir(familiar: FamilyMember): void {
    this.familiarEditando = familiar;
    this.mostrarModal = true;

    // Convertir fecha a formato YYYY-MM-DD para el input date
    let fechaFormato = '';
    if (familiar.fechaNacimiento) {
      if (typeof familiar.fechaNacimiento === 'string') {
        // Si ya está en formato YYYY-MM-DD, usarlo directo
        if (familiar.fechaNacimiento.includes('-') && !familiar.fechaNacimiento.includes('T')) {
          fechaFormato = familiar.fechaNacimiento;
        } else {
          // Si está en ISO o formato datetime, extraer solo la fecha
          fechaFormato = familiar.fechaNacimiento.split('T')[0];
        }
      }
    }

    // Precarga los datos del familiar
    this.formulario.patchValue({
      nombre: familiar.nombre.split(' ')[0],
      apellidos: familiar.apellidos || '',
      fechaNacimiento: fechaFormato,
      tipoSangre: familiar.tipoSangre || '',
      parentesco: familiar.relacion || '',
      numeroCelular: familiar.numeroCelular || '',
      contactoEmergencia: familiar.contactoEmergencia || ''
    });

    this.enfermedadesSeleccionadas = familiar.enfermedades ? [...familiar.enfermedades] : [];
    this.alergiaSeleccionadas = familiar.alergias ? [...familiar.alergias] : [];
    this.enfermedadInput = '';
    this.alergiaInput = '';

    setTimeout(() => {
      if (this.modalEditar) {
        this.modalEditar.nativeElement.classList.add('mostrar');
      }
    }, 0);
  }

  cerrar(): void {
    this.mostrarModal = false;
    if (this.modalEditar) {
      this.modalEditar.nativeElement.classList.remove('mostrar');
    }
    this.formulario.reset();
    this.enfermedadesSeleccionadas = [];
    this.alergiaSeleccionadas = [];
    this.familiarEditando = null;
  }

  agregarEnfermedad(): void {
    const enfermedad = this.enfermedadInput.trim();
    if (
      enfermedad &&
      !this.enfermedadesSeleccionadas.includes(enfermedad) &&
      enfermedad.length > 0
    ) {
      this.enfermedadesSeleccionadas.push(enfermedad);
      this.enfermedadInput = '';
    }
  }

  quitarEnfermedad(enfermedad: string): void {
    this.enfermedadesSeleccionadas = this.enfermedadesSeleccionadas.filter(
      (e) => e !== enfermedad
    );
  }

  agregarAlergia(): void {
    const alergia = this.alergiaInput.trim();
    if (
      alergia &&
      !this.alergiaSeleccionadas.includes(alergia) &&
      alergia.length > 0
    ) {
      this.alergiaSeleccionadas.push(alergia);
      this.alergiaInput = '';
    }
  }

  quitarAlergia(alergia: string): void {
    this.alergiaSeleccionadas = this.alergiaSeleccionadas.filter(
      (a) => a !== alergia
    );
  }

  actualizar(): void {
    if (this.formulario.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    if (!this.familiarEditando) return;

    this.cargando = true;

    setTimeout(() => {
      const familiarActualizado: FamilyMember = {
        ...this.familiarEditando!,
        nombre: this.formulario.value.nombre + ' ' + this.formulario.value.apellidos,
        apellidos: this.formulario.value.apellidos,
        relacion: this.formulario.value.parentesco,
        fechaNacimiento: this.formulario.value.fechaNacimiento,
        tipoSangre: this.formulario.value.tipoSangre,
        numeroCelular: this.formulario.value.numeroCelular,
        contactoEmergencia: this.formulario.value.contactoEmergencia,
        enfermedades: this.enfermedadesSeleccionadas,
        alergias: this.alergiaSeleccionadas,
        puedeAgendarCitas: this.familiarEditando!.puedeAgendarCitas,
        puedeVerHistorial: this.familiarEditando!.puedeVerHistorial
      };

      console.log('📤 Familiar actualizado:', familiarActualizado);
      this.familiarActualizado.emit(familiarActualizado);

      this.mostrarMensajeExito();
      this.cargando = false;
      this.cerrar();
    }, 1000);
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.formulario.controls).forEach((campo) => {
      this.formulario.get(campo)?.markAsTouched();
    });
  }

  private mostrarMensajeExito(): void {
    alert('¡Familiar actualizado exitosamente!');
  }

  esCampoInvalido(nombreCampo: string): boolean {
    const campo = this.formulario.get(nombreCampo);
    return !!(campo && campo.invalid && campo.touched);
  }

  obtenerErrorCampo(nombreCampo: string): string {
    const campo = this.formulario.get(nombreCampo);
    if (!campo || !campo.errors || !campo.touched) return '';

    if (campo.errors['required']) return 'Este campo es obligatorio';
    if (campo.errors['minlength'])
      return `Mínimo ${campo.errors['minlength'].requiredLength} caracteres`;
    if (campo.errors['pattern']) {
      if (nombreCampo === 'numeroCelular' || nombreCampo === 'contactoEmergencia') {
        return 'Formato de teléfono inválido';
      }
      return 'Formato inválido';
    }
    if (campo.errors['edadInvalida']) return 'Fecha de nacimiento inválida';

    return 'Campo inválido';
  }

  cerrarAlClickFuera(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal-overlay')) {
      this.cerrar();
    }
  }
}
