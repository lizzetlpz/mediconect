import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener URL de retorno si existe
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';

    // Inicializar formulario
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]  // ✅ Cambiar a 8 caracteres
    });
  }

  onSubmit(): void {
    console.log('🔐 Intentando login...');
    console.log('📋 Datos del formulario:', this.loginForm.value);

    if (this.loginForm.invalid) {
      console.log('❌ Formulario inválido');
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Mapear los campos al formato que espera el backend
    const loginData = {
      email: this.loginForm.value.email,      // Backend acepta "email" o "correo"
      password: this.loginForm.value.password  // Backend acepta "password" o "contraseña"
    };

    console.log('📤 Enviando al backend:', loginData);

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        console.log('👤 Usuario:', response.user);
        console.log('🎭 Rol ID del usuario:', response.user.rol_id);

        // Guardar usuario y tokens en localStorage
        this.authService.setCurrentUser(
          response.user,
          response.token,
          response.refreshToken
        );

        // 🎯 REDIRECCIÓN SEGÚN EL ROL_ID
        if (this.returnUrl) {
          // Si hay una URL de retorno específica, úsala
          console.log('🔄 Redirigiendo a returnUrl:', this.returnUrl);
          this.router.navigateByUrl(this.returnUrl);
        } else {
          // Redirige según el rol_id del usuario (1=admin, 2=doctor, 3=paciente)
          switch (response.user.rol_id) {
            case 1:  // Admin
              console.log('👨‍💼 Redirigiendo a admin-dashboard');
              this.router.navigate(['/admin-dashboard']);
              break;
            case 2:  // Doctor
              console.log('🩺 Redirigiendo a doctor-dashboard');
              this.router.navigate(['/doctor/dashboard']);
              break;
            case 3:  // Paciente
              console.log('🙋‍♂️ Redirigiendo a dashboard de paciente');
              this.router.navigate(['/dashboard']);
              break;
            default:
              console.log('❓ Rol desconocido, redirigiendo a dashboard');
              this.router.navigate(['/dashboard']);
          }
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error completo:', error);
        console.error('❌ Respuesta del servidor:', error.error);

        this.isLoading = false;

        // Mensajes de error específicos
        if (error.status === 401) {
          this.errorMessage = 'Correo o contraseña incorrectos';
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Error al iniciar sesión. Intenta de nuevo.';
        }
      }
    });
  }

  loginWithGoogle(): void {
    console.log('🔴 Google login no implementado todavía');
    // TODO: Implementar OAuth de Google aquí
    alert('Funcionalidad de Google Login próximamente');
  }

  // Getters para facilitar acceso en el template
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
