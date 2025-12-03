import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/nav/navbar.component';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Pago {
  id: number;
  usuario_id: number;
  medico_id: number;
  cita_id?: number;
  monto: number;
  metodo_pago: string;
  estado: string;
  concepto: string;
  fecha_pago: string;
  medico_nombre?: string;
  factura_url?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  // Propiedades para historial de pagos
  isPaciente = false;
  pagos: Pago[] = [];
  pagosFiltrados: Pago[] = [];
  filtroSeleccionado = 'todos';
  estadosFiltro = ['todos', 'completado', 'pendiente'];
  totalPagado = 0;
  totalPendiente = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.profileForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido_paterno: ['', [Validators.required, Validators.minLength(2)]],
      apellido_materno: [''],
      email: [{value: '', disabled: true}, [Validators.required, Validators.email]],
      telefono: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      fecha_nacimiento: ['']
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Usuario actual:', this.currentUser);

    if (this.currentUser) {
      this.profileForm.patchValue({
        nombre: this.currentUser.nombre,
        apellido_paterno: this.currentUser.apellido_paterno,
        apellido_materno: this.currentUser.apellido_materno || '',
        email: this.currentUser.email,
        telefono: this.currentUser.telefono || '',
        fecha_nacimiento: this.currentUser.fecha_nacimiento || ''
      });

      // Verificar si es paciente
      this.isPaciente = this.currentUser.rol_id === 2;

      // Cargar pagos si es paciente
      if (this.isPaciente) {
        this.cargarPagos();
      }
    } else {
      console.error('❌ No hay usuario autenticado');
    }
  }

  cargarPagos(): void {
    if (!this.currentUser) return;

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<Pago[]>(
      `http://localhost:3000/api/pagos/paciente/${this.currentUser.usuario_id}`,
      { headers }
    ).subscribe({
      next: (pagos) => {
        console.log('✅ Pagos cargados:', pagos);
        this.pagos = pagos;
        this.actualizarFiltro();
      },
      error: (error) => {
        console.error('❌ Error cargando pagos:', error);
        this.pagos = [];
      }
    });
  }

  actualizarFiltro(): void {
    if (this.filtroSeleccionado === 'todos') {
      this.pagosFiltrados = this.pagos;
    } else {
      this.pagosFiltrados = this.pagos.filter(p => p.estado === this.filtroSeleccionado);
    }

    // Calcular totales
    this.totalPagado = this.pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + p.monto, 0);

    this.totalPendiente = this.pagos
      .filter(p => p.estado === 'pendiente')
      .reduce((sum, p) => sum + p.monto, 0);
  }

  actualizarFiltroSeleccion(estado: string): void {
    this.filtroSeleccionado = estado;
    this.actualizarFiltro();
  }

  descargarFactura(pago: Pago): void {
    console.log('📥 Descargando factura del pago:', pago.id);

    const token = this.authService.getToken();
    if (!token) {
      alert('No tienes autorización. Inicia sesión nuevamente.');
      return;
    }

    // Crear contenido de texto plano como en la imagen
    const contenidoFactura = `FACTURA: INV-${pago.id}
Fecha: ${new Date().toLocaleDateString('es-ES')}
----------------------------------------
Paciente: ${this.currentUser?.nombre || 'Cliente'}
Médico: Dr. Carlos Ramirez
----------------------------------------
Descripción: ${pago.concepto || 'Consulta médica'}
Monto: $${pago.monto}
Método de pago: ${pago.metodo_pago || 'tarjeta credito'}
ID Transacción: TX-${pago.id}-${Date.now()}
Estado: ${pago.estado}
----------------------------------------
Medicom - Telemedicina Profesional`;

    // Crear blob con el contenido de texto
    const blob = new Blob([contenidoFactura], { type: 'text/plain;charset=utf-8' });

    // Crear enlace de descarga
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Factura-${pago.id}.txt`;

    // Forzar descarga
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar URL
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    console.log('✅ Factura .txt descargada exitosamente');
  }

  onSubmit(): void {
    console.log('📝 Intentando actualizar perfil...');
    console.log('📋 Datos del formulario:', this.profileForm.value);

    if (this.profileForm.invalid) {
      console.log('❌ Formulario inválido');
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.currentUser) {
      this.errorMessage = 'No hay usuario autenticado';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    // Datos a enviar al backend
    const updateData = {
      nombre: this.profileForm.value.nombre,
      apellido_paterno: this.profileForm.value.apellido_paterno,
      apellido_materno: this.profileForm.value.apellido_materno || null,
      telefono: this.profileForm.value.telefono || null,
      fecha_nacimiento: this.profileForm.value.fecha_nacimiento || null
    };

    console.log('📤 Enviando actualización:', updateData);

    // Llamar al endpoint de actualización
    this.http.put(
      `http://localhost:3000/api/usuarios/${this.currentUser.usuario_id}`,
      updateData
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Perfil actualizado:', response);

        // Actualizar el usuario en localStorage
        const updatedUser: User = {
          ...this.currentUser!,
          ...updateData
        };

        const token = this.authService.getToken();
        const refreshToken = localStorage.getItem('refreshToken');

        if (token && refreshToken) {
          this.authService.setCurrentUser(updatedUser, token, refreshToken);
        }

        this.currentUser = updatedUser;
        this.successMessage = 'Perfil actualizado correctamente';
        this.isLoading = false;

        // Ocultar mensaje después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error actualizando perfil:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error al actualizar el perfil';

        // Ocultar mensaje de error después de 5 segundos
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  // Calcular edad desde fecha de nacimiento
  calculateAge(): number | null {
    if (!this.currentUser?.fecha_nacimiento) return null;

    const today = new Date();
    const birth = new Date(this.currentUser.fecha_nacimiento);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  // Obtener nombre del rol
  getRoleName(): string {
    if (!this.currentUser) return '';

    switch (this.currentUser.rol_id) {
      case 1: return 'Administrador';
      case 2: return 'Paciente';
      case 3: return 'Doctor';
      default: return 'Desconocido';
    }
  }

  // Getters para validaciones en el template
  get nombre() {
    return this.profileForm.get('nombre');
  }

  get apellido_paterno() {
    return this.profileForm.get('apellido_paterno');
  }

  get telefono() {
    return this.profileForm.get('telefono');
  }
}
