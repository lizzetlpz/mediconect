// register.component.ts

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
      rol: ['paciente', Validators.required],
      cedulaProfesional: [''] // Se agregará validación dinámica
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

    // Verificar que no tenga caracteres especiales peligrosos
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

    // Formato: 8-12 dígitos
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
    console.log('❓ ¿Es válido?', this.registerForm.valid);
    console.log('❌ Errores:', this.registerForm.errors);

    // Mostrar errores de cada campo
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      if (control?.invalid) {
        console.log(`❌ Campo "${key}" es inválido:`, control.errors);
      }
    });

    if (this.registerForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });

      // Mensaje de error más específico
      if (this.registerForm.get('password')?.hasError('minlength')) {
        this.errorMessage = 'La contraseña debe tener al menos 8 caracteres';
      } else if (this.registerForm.errors?.['passwordMismatch']) {
        this.errorMessage = 'Las contraseñas no coinciden';
      } else if (this.registerForm.get('correo')?.hasError('email')) {
        this.errorMessage = 'Ingresa un correo electrónico válido';
      } else {
        this.errorMessage = 'Por favor completa todos los campos correctamente';
      }

      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formValue = this.registerForm.value;

    // Mapear correctamente a los nombres que espera el backend
    const datosRegistro = {
      nombre: formValue.nombre,
      apellido_paterno: formValue.apellido, // Mapear apellido -> apellido_paterno
      email: formValue.correo,
      password: formValue.password,
      rol: formValue.rol,
      ...(formValue.rol === 'doctor' && { cedulaProfesional: formValue.cedulaProfesional })
    };

    console.log('📤 Enviando datos al backend:', datosRegistro);

    // Timeout de seguridad - si no responde en 5 minutos, mostrar error
    const timeoutId = setTimeout(() => {
      this.loading = false;
      this.errorMessage = 'La solicitud está tomando demasiado tiempo. El servidor puede estar desplegándose. Intenta de nuevo en 1 minuto.';
      console.error('⏱️ TIMEOUT: El servidor no respondió en 5 minutos');
    }, 300000); // 5 minutos = 300000 ms

    console.log('⏳ Esperando respuesta del servidor...');

    this.authService.register(datosRegistro as any).subscribe({
      next: (response) => {
        clearTimeout(timeoutId); // ✅ Cancelar timeout inmediatamente
        this.loading = false;
        console.log('✅ Registro exitoso:', response);
        console.log('📧 requireEmailVerification:', response.requireEmailVerification);
        console.log('👤 Usuario:', response.user);
        console.log('🎭 Rol ID:', response.user?.rol_id);

        if (response.requireEmailVerification) {
          // Redirigir a verificación de email
          console.log('📧 Redirigiendo a verificación de email...');
          this.router.navigate(['/verify-email'], {
            queryParams: { email: response.email }
          });
        } else {
          console.log('⚠️ No requiere verificación de email, guardando usuario...');
          // Guardar usuario y tokens (caso sin verificación)
          this.authService.setCurrentUser(
            response.user,
            response.token,
            response.refreshToken
          );

          // Redirigir según el rol_id (2=paciente, 3=medico)
          const rol_id = response.user.rol_id;
          console.log('🔀 Verificando redirección para rol_id:', rol_id);
          if (rol_id === 3) {
            console.log('🩺 Registro exitoso - Redirigiendo a doctor-dashboard');
            this.router.navigate(['/doctor/dashboard']);
          } else if (rol_id === 2) {
            console.log('🙋‍♂️ Registro exitoso - Redirigiendo a dashboard de paciente');
            this.router.navigate(['/dashboard']);
          } else {
            console.log('❓ Rol desconocido, redirigiendo a dashboard');
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (error) => {
        clearTimeout(timeoutId); // ✅ Cancelar timeout inmediatamente
        this.loading = false;

        console.error('❌ Error completo:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error object:', error.error);
        console.error('❌ URL:', error.url);

        // Mostrar mensaje de error del servidor
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor. Posibles causas:\n' +
                              '1. El servidor está desplegándose (espera 1-2 minutos)\n' +
                              '2. Problemas de red\n' +
                              '3. CORS bloqueado';
          console.error('⚠️ Error de red (status 0): El servidor no responde o CORS bloqueado');
        } else if (error.status === 504 || error.status === 503) {
          this.errorMessage = 'El servidor está temporalmente no disponible. Railway puede estar desplegando. Espera 1 minuto e intenta de nuevo.';
        } else {
          this.errorMessage = `Error al registrar usuario (${error.status}). Intenta nuevamente.`;
        }
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  // Getters para fácil acceso en el template
  get nombre() { return this.registerForm.get('nombre'); }
  get apellido() { return this.registerForm.get('apellido'); }
  get correo() { return this.registerForm.get('correo'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get rol() { return this.registerForm.get('rol'); }
  get cedulaProfesional() { return this.registerForm.get('cedulaProfesional'); }

  // Getter para verificar si se debe mostrar el campo de cédula
  get isDoctor(): boolean {
    return this.registerForm.get('rol')?.value === 'doctor';
  }
}
