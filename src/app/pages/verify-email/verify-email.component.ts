import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="verify-container">
      <div class="verify-box">
        <div class="logo-section">
          <h1 class="logo">MediConnect</h1>
          <p class="subtitle">Verificar Email</p>
        </div>

        <div class="email-info" *ngIf="email">
          <p>Se ha enviado un código de verificación a:</p>
          <strong>{{ email }}</strong>
        </div>

        <form (ngSubmit)="verificarEmail()" class="verify-form">
          <div class="form-group">
            <label for="codigo">Código de Verificación</label>
            <input
              id="codigo"
              type="text"
              [(ngModel)]="codigo"
              name="codigo"
              placeholder="123456"
              maxlength="6"
              class="input-field"
              [class.error]="errorMessage">
            <small class="help-text">Ingresa el código de 6 dígitos que recibiste por email</small>
          </div>

          <div class="alert alert-error" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <div class="alert alert-success" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <button type="submit" class="submit-btn" [disabled]="loading || !codigo">
            <span *ngIf="!loading">Verificar Email</span>
            <span *ngIf="loading">Verificando...</span>
          </button>
        </form>

        <div class="verify-footer">
          <p>¿No recibiste el código? <a href="#" (click)="reenviarCodigo($event)">Reenviar código</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verify-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0066cc 0%, #00b8d4 100%);
      padding: 20px;
    }

    .verify-box {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    .logo {
      color: #0066cc;
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }

    .subtitle {
      color: #6b7280;
      margin: 0 0 30px 0;
      font-size: 16px;
    }

    .email-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #374151;
    }

    .input-field {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      text-align: center;
      letter-spacing: 2px;
      transition: border-color 0.2s ease;
    }

    .input-field:focus {
      outline: none;
      border-color: #0066cc;
    }

    .input-field.error {
      border-color: #dc2626;
    }

    .help-text {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      color: #6b7280;
    }

    .alert {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .alert-error {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .alert-success {
      background-color: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .submit-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #0066cc, #00b8d4);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .submit-btn:hover {
      transform: translateY(-1px);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .verify-footer {
      margin-top: 20px;
      font-size: 14px;
    }

    .verify-footer a {
      color: #0066cc;
      text-decoration: none;
    }

    .verify-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class VerifyEmailComponent implements OnInit {
  codigo = '';
  email = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Obtener el email de los parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
  }

  verificarEmail(): void {
    if (!this.codigo || this.codigo.length !== 6) {
      this.errorMessage = 'Ingresa un código válido de 6 dígitos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.http.post('http://localhost:3000/api/auth/verify-email', {
      email: this.email,
      codigo: this.codigo
    }).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.successMessage = response.message;
        
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { verified: 'true', email: this.email }
          });
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Error al verificar el código';
      }
    });
  }

  reenviarCodigo(event: Event): void {
    event.preventDefault();
    // TODO: Implementar reenvío de código
    this.errorMessage = '';
    alert('Función de reenvío en desarrollo');
  }
}