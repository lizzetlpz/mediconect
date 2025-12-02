import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';

interface PerfilMedico {
  usuario_id?: number;
  nombre?: string;
  apellido_paterno?: string;
  especialidad?: string;
  anos_experiencia?: number;
  universidad?: string;
  cedula_profesional?: string;
  telefono?: string;
  descripcion?: string;
  email?: string;
  tarifa_consulta?: number;
}

@Component({
  selector: 'app-editar-perfil-medico',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './editar-perfil-medico.component.html',
  styleUrls: ['./editar-perfil-medico.component.css']
})
export class EditarPerfilMedicoComponent implements OnInit {
  @Output() cerrar = new EventEmitter<void>();
  
  mostrarModal = false;
  cargando = false;
  formulario: FormGroup;
  perfilActual: PerfilMedico = {};
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.formulario = this.crearFormulario();
  }

  ngOnInit(): void {
    this.cargarPerfilMedico();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      especialidad: ['', [Validators.required, Validators.minLength(3)]],
      anos_experiencia: ['', [Validators.required, Validators.min(0), Validators.max(70)]],
      universidad: ['', [Validators.required, Validators.minLength(3)]],
      cedula_profesional: ['', [Validators.required, Validators.minLength(5)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-()]+$/)]],
      descripcion: ['', [Validators.minLength(10), Validators.maxLength(500)]],
      tarifa_consulta: ['', [Validators.required, Validators.min(0)]]
    });
  }

  private cargarPerfilMedico(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<PerfilMedico>(
      `http://localhost:3000/api/medicos/${user.usuario_id}`,
      { headers }
    ).subscribe({
      next: (perfil) => {
        this.perfilActual = perfil;
        this.formulario.patchValue({
          especialidad: perfil.especialidad || '',
          anos_experiencia: perfil.anos_experiencia || 0,
          universidad: perfil.universidad || '',
          cedula_profesional: perfil.cedula_profesional || '',
          telefono: perfil.telefono || '',
          descripcion: perfil.descripcion || '',
          tarifa_consulta: perfil.tarifa_consulta || 0
        });
      },
      error: (error) => {
        console.error('Error cargando perfil:', error);
        this.mensajeError = 'Error al cargar el perfil';
      }
    });
  }

  abrir(): void {
    this.mostrarModal = true;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.cargarPerfilMedico();
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.cerrar.emit();
  }

  guardarPerfil(): void {
    if (this.formulario.invalid) {
      this.marcarCamposComoTocados();
      this.mensajeError = 'Por favor completa todos los campos correctamente';
      return;
    }

    this.cargando = true;
    this.mensajeExito = '';
    this.mensajeError = '';

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.mensajeError = 'Usuario no autenticado';
      this.cargando = false;
      return;
    }

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const datosActualizados = {
      ...this.formulario.value,
      usuario_id: user.usuario_id
    };

    this.http.put(
      `http://localhost:3000/api/medicos/${user.usuario_id}`,
      datosActualizados,
      { headers }
    ).subscribe({
      next: (response: any) => {
        this.mensajeExito = '✅ Perfil actualizado exitosamente';
        this.cargando = false;
        setTimeout(() => {
          this.cerrarModal();
        }, 1500);
      },
      error: (error) => {
        console.error('Error actualizando perfil:', error);
        this.mensajeError = error.error?.message || 'Error al guardar el perfil';
        this.cargando = false;
      }
    });
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.formulario.controls).forEach(key => {
      this.formulario.get(key)?.markAsTouched();
    });
  }

  esCampoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.formulario.get(campo);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    if (control.errors['min']) return `El valor mínimo es ${control.errors['min'].min}`;
    if (control.errors['max']) return `El valor máximo es ${control.errors['max'].max}`;
    if (control.errors['pattern']) return 'Formato inválido';

    return 'Campo inválido';
  }

  cerrarAlClickFuera(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
  }
}
