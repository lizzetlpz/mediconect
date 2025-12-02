import { Component, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface FamilyMember {
  pacienteId: string;
  nombre: string;
  apellidos: string;
  parentesco: string;
  relacion: string;
  puedeAgendarCitas: boolean;
  puedeVerHistorial: boolean;
  fechaAgregado: Date;
  fechaNacimiento?: string;
  tipoSangre?: string;
  numeroCelular?: string;
  contactoEmergencia?: string;
  enfermedades?: string[];
  alergias?: string[];
  fechaRegistro?: Date;
}

@Component({
  selector: 'app-registrar-familiar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './registrarF.component.html',
  styleUrls: ['./registrarF.component.css']
})
export class RegistrarFamiliarComponent {
  @ViewChild('modalAgregar', { static: false }) modalAgregar!: ElementRef<HTMLDivElement>;
  @Output() familiarAgregado = new EventEmitter<FamilyMember>();

  formulario: FormGroup;
  mostrarModal = false;
  cargando = false;
  enfermedadInput = '';
  alergiaInput = '';
  enfermedadesSeleccionadas: string[] = [];
  alergiaSeleccionadas: string[] = [];

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

  abrir(): void {
    this.mostrarModal = true;
    this.formulario.reset();
    this.enfermedadesSeleccionadas = [];
    this.alergiaSeleccionadas = [];
    this.enfermedadInput = '';
    this.alergiaInput = '';

    setTimeout(() => {
      if (this.modalAgregar) {
        this.modalAgregar.nativeElement.classList.add('mostrar');
      }
    }, 0);
  }

  cerrar(): void {
    this.mostrarModal = false;
    if (this.modalAgregar) {
      this.modalAgregar.nativeElement.classList.remove('mostrar');
    }
    this.formulario.reset();
    this.enfermedadesSeleccionadas = [];
    this.alergiaSeleccionadas = [];
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

  registrar(): void {
    if (this.formulario.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.cargando = true;

    setTimeout(() => {
      const familiarRegistrado: FamilyMember = {
        ...this.formulario.value,
        relacion: this.formulario.value.parentesco,
        enfermedades: this.enfermedadesSeleccionadas,
        alergias: this.alergiaSeleccionadas,
        fechaRegistro: new Date(),
        puedeAgendarCitas: false,
        puedeVerHistorial: false,
        fechaAgregado: new Date(),
        pacienteId: ''
      };

      console.log('📤 Familiar registrado:', familiarRegistrado);
      this.familiarAgregado.emit(familiarRegistrado);

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
    alert('¡Familiar registrado exitosamente!');
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
