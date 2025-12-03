// register.component.ts - VERSIÓN CORREGIDA CON ROL_ID

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, this.emailValidator]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
      rol: ['paciente', Validators.required], // Mantenemos como string en el formulario
      cedulaProfesional: ['']
    }, {
      validators: this.passwordMatchValidator
    });

    // Escuchar cambios en el rol para agregar validación de cédula
    this.registerForm.get('rol')?.valueChanges.subscribe(rol => {
      const cedulaControl = this.registerForm.get('cedulaProfesional');
      if (rol === 'doctor') {
        cedulaControl?.setValidators([Validators.required, this.cedulaProfesionalValidator]);
      } else {
        cedulaControl?.clearValidators();
        cedulaControl?.setValue('');
      }
      cedulaControl?.updateValueAndValidity();
    });
  }

  // Validador de email más estricto
  emailValidator(control: any) {
    const email = control.value;
    if (!email) return null;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const valid = emailRegex.test(email);

    if (!valid) {
      return { invalidEmail: true };
    }

    const dangerousChars = /[<>"'&]/;
    if (dangerousChars.test(email)) {
      return { dangerousChars: true };
    }

    return null;
  }

  // Validador de fortaleza de contraseña
  passwordStrengthValidator(control: any) {
    const password = control.value;
    if (!password) return null;

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isStrong = hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChars;

    if (!isStrong) {
      return { weakPassword: true };
    }

    return null;
  }

  // Validador de cédula profesional
  cedulaProfesionalValidator(control: any) {
    const cedula = control.value;
    if (!cedula) return null;

    const cedulaRegex = /^\d{8,12}$/;
    if (!cedulaRegex.test(cedula)) {
      return { invalidCedula: true };
    }

    return null;
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    console.log('🔴 Botón clickeado!');
    console.log('📋 Estado del formulario:', this.registerForm.value);

    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });

      if (this.registerForm.get('password')?.hasError('minlength')) {
        this.errorMessage = 'La contraseña debe tener al menos 8 caracteres';
      } else if (this.registerForm.errors?.['passwordMismatch']) {
        this.errorMessage = 'Las contraseñas no coinciden';
      } else if (this.registerForm.get('correo')?.hasError('invalidEmail')) {
        this.errorMessage = 'Ingresa un correo electrónico válido';
      } else {
        this.errorMessage = 'Por favor completa todos los campos correctamente';
      }

      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formValue = this.registerForm.value;

    // ✅ CONVERSIÓN DEL ROL A rol_id (número)
    const rolId = formValue.rol === 'doctor' ? 2 : 3; // doctor = 2, paciente = 3

    // Preparar datos en el formato correcto
    const datosRegistro = {
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      correo: formValue.correo,
      password: formValue.password,
      rol_id: rolId, // ✅ ENVIAR rol_id como número
      ...(formValue.rol === 'doctor' && { cedulaProfesional: formValue.cedulaProfesional })
    };

    console.log('📤 Enviando datos al backend:', datosRegistro);
    console.log('🎯 rol_id enviado:', rolId);

    const timeoutId = setTimeout(() => {
      this.loading = false;
      this.errorMessage = 'La solicitud está tomando demasiado tiempo. Intenta de nuevo.';
    }, 30000);

    this.authService.register(datosRegistro as any).subscribe({
      next: (response) => {
        clearTimeout(timeoutId);
        this.loading = false;
        console.log('✅ Registro exitoso:', response);
        console.log('👤 Usuario registrado con rol_id:', response.user?.rol_id);

        if (response.requireEmailVerification) {
          this.router.navigate(['/verify-email'], {
            queryParams: { email: response.email }
          });
        } else {
          // Guardar usuario y tokens
          this.authService.setCurrentUser(
            response.user,
            response.token,
            response.refreshToken
          );

          // ✅ REDIRIGIR SEGÚN EL ROL_ID
          if (response.user.rol_id === 2) {
            console.log('🏥 Redirigiendo a dashboard de médico');
            this.router.navigate(['/dashboard-medico']);
          } else if (response.user.rol_id === 3) {
            console.log('👨‍⚕️ Redirigiendo a dashboard de paciente');
            this.router.navigate(['/dashboard-paciente']);
          } else {
            // Fallback por si acaso
            console.log('❓ Rol desconocido, redirigiendo a dashboard general');
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (error) => {
        clearTimeout(timeoutId);
        this.loading = false;

        console.error('❌ Error completo:', error);
        console.error('❌ Respuesta del servidor:', error.error);

        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
        } else if (error.status === 500) {
          this.errorMessage = 'Error interno del servidor. Por favor intenta de nuevo.';
        } else {
          this.errorMessage = 'Error al registrar usuario. Intenta nuevamente.';
        }
      }
    });
  }

  // Getters
  get nombre() { return this.registerForm.get('nombre'); }
  get apellido() { return this.registerForm.get('apellido'); }
  get correo() { return this.registerForm.get('correo'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get rol() { return this.registerForm.get('rol'); }
  get cedulaProfesional() { return this.registerForm.get('cedulaProfesional'); }

  get isDoctor(): boolean {
    return this.registerForm.get('rol')?.value === 'doctor';
  }
}
