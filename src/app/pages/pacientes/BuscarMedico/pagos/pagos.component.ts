import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PagosService, PagoBackend } from '../../../../services/pagos.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-modal-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pagos.component.html',
  styleUrls: ['./pagos.component.css']
})
export class ModalPagoComponent implements OnInit {
  @Output() pagoCancelado = new EventEmitter<void>();
  @Output() pagoCompletado = new EventEmitter<any>();

  mostrarModal = false;
  mostrarHistorial = false;
  cargando = false;
  formularioPago: FormGroup;
  metodoPagoSeleccionado = 'tarjeta';
  montoPago = 0;
  mensajeError = '';
  mensajeExito = '';
  citaActual: any = null; // Agregar para guardar la info de la cita
  
  // Historial de pagos
  pagosPaciente: PagoBackend[] = [];
  cargandoHistorial = false;
  totalPagado = 0;

  metodosPago = [
    { id: 'tarjeta', label: '💳 Tarjeta de Crédito/Débito', icono: '💳' },
    { id: 'transferencia', label: '🏦 Transferencia Bancaria', icono: '🏦' },
    { id: 'billetera', label: '📱 Billetera Digital', icono: '📱' }
  ];

  constructor(
    private fb: FormBuilder,
    private pagosService: PagosService,
    private authService: AuthService
  ) {
    this.formularioPago = this.crearFormularioPago();
  }

  ngOnInit(): void {
    this.cargarHistorialPagos();
  }

  private crearFormularioPago(): FormGroup {
    return this.fb.group({
      nombreTitular: ['', [Validators.required, Validators.minLength(3)]],
      numeroTarjeta: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      fechaExpiracion: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private cargarHistorialPagos(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.cargandoHistorial = true;
    this.pagosService.getPagosByPaciente(user.usuario_id).subscribe({
      next: (pagos: PagoBackend[]) => {
        this.pagosPaciente = pagos.sort((a, b) => {
          const fechaA = new Date(a.creado_en || a.fecha || 0).getTime();
          const fechaB = new Date(b.creado_en || b.fecha || 0).getTime();
          return fechaB - fechaA; // Orden descendente
        });
        
        // Calcular total pagado
        this.totalPagado = this.pagosPaciente
          .filter(p => p.estado === 'completado' || p.estado !== 'cancelado')
          .reduce((sum, pago) => sum + (Number(pago.monto) || 0), 0);
        
        this.cargandoHistorial = false;
      },
      error: (error) => {
        console.error('Error cargando pagos:', error);
        this.cargandoHistorial = false;
      }
    });
  }

  abrir(monto: number, cita?: any): void {
    this.montoPago = monto;
    this.citaActual = cita || null;
    console.log('📋 Abriendo modal de pago con cita:', this.citaActual);
    this.mostrarModal = true;
    this.formularioPago.reset();
  }

  abrirHistorial(): void {
    this.mostrarHistorial = true;
    this.cargarHistorialPagos();
  }

  cerrar(): void {
    this.mostrarModal = false;
    this.pagoCancelado.emit();
  }

  cerrarHistorial(): void {
    this.mostrarHistorial = false;
  }

  procesarPago(): void {
    if (this.formularioPago.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.cargando = true;

    // Guardar pago en base de datos
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.error('❌ Usuario no autenticado');
      this.mensajeError = '❌ Usuario no autenticado';
      this.cargando = false;
      return;
    }

    console.log('👤 Usuario actual:', user);
    console.log('💰 Monto a pagar:', this.montoPago);
    console.log('💳 Método:', this.metodoPagoSeleccionado);

    const datoPago = {
      paciente_id: Number(user.usuario_id),
      monto: Number(this.montoPago),
      metodo: this.metodoPagoSeleccionado,
      estado: 'completado',
      descripcion: 'Pago de cita médica',
      transaccion: this.generarIdTransaccion(),
      // Agregar email del formulario para notificaciones
      email_notificacion: this.formularioPago.get('email')?.value,
      // Agregar información de la cita
      ...(this.citaActual && {
        medico_id: Number(this.citaActual.doctorId),
        cita_fecha: this.citaActual.fecha,
        cita_hora: this.citaActual.hora,
        cita_motivo: this.citaActual.motivoConsulta,
        cita_sintomas: this.citaActual.sintomas,
        cita_notas: this.citaActual.notasAdicionales,
        cita_tipo: this.citaActual.tipoConsulta,
        doctor_nombre: this.citaActual.doctorNombre
      })
    };

    console.log('📤 Enviando pago:', datoPago);

    this.pagosService.createPago(datoPago).subscribe({
      next: (response) => {
        console.log('✅ Pago creado:', response);
        this.mensajeExito = '✅ ¡Pago procesado exitosamente!';
        this.mensajeError = '';
        this.cargando = false;
        
        // Agregar el email del formulario a la respuesta para que se use en la cita
        const respuestaConEmail = {
          ...response,
          email_notificacion: this.formularioPago.get('email')?.value
        };
        
        this.pagoCompletado.emit(respuestaConEmail);
        
        // Esperar 2 segundos y cerrar
        setTimeout(() => {
          this.cargarHistorialPagos();
          this.cerrar();
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Error procesando pago:', error);
        console.error('Respuesta del servidor:', error.error);
        console.error('Status:', error.status);
        
        const mensajeError = error.error?.message || error.message || 'Error al procesar el pago. Intenta de nuevo.';
        this.mensajeError = `❌ ${mensajeError}`;
        this.mensajeExito = '';
        this.cargando = false;
      }
    });
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.formularioPago.controls).forEach(campo => {
      this.formularioPago.get(campo)?.markAsTouched();
    });
  }

  private generarIdTransaccion(): string {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9);
  }

  private mostrarMensajeExito(): void {
    alert('¡Pago procesado exitosamente!');
  }

  esCampoInvalido(nombreCampo: string): boolean {
    const campo = this.formularioPago.get(nombreCampo);
    return !!(campo && campo.invalid && campo.touched);
  }

  obtenerErrorCampo(nombreCampo: string): string {
    const campo = this.formularioPago.get(nombreCampo);
    if (!campo || !campo.errors || !campo.touched) return '';

    if (campo.errors['required']) return 'Este campo es obligatorio';
    if (campo.errors['minlength']) return `Mínimo ${campo.errors['minlength'].requiredLength} caracteres`;
    if (campo.errors['pattern']) return 'Formato inválido';
    if (campo.errors['email']) return 'Email inválido';

    return 'Campo inválido';
  }

  cerrarAlClickFuera(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal-overlay')) {
      this.cerrar();
    }
  }

  obtenerEstadoClase(estado: string): string {
    return `estado-${estado}`;
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
