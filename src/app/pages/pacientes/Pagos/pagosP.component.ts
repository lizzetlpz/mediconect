import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { PatientSidebarComponent } from '../../../barraLateral/paciente/Barrap.component';
import { FormsModule } from '@angular/forms';
import { PagosService, PagoBackend } from '../../../services/pagos.service';
import { AuthService } from '../../../services/auth.service';

interface Pago {
  id: string;
  monto: number;
  estado: 'Completado' | 'Pendiente' | 'Fallido';
  descripcion: string;
  transaccion: string;
  metodo: string;
  fecha: string;
  factura: string;
  medico: string;
  fechaCita: string;
  motivo: string;
}

interface EstadisticasPagos {
  totalPagado: number;
  completados: number;
  pendientes: number;
  fallidos: number;
}

@Component({
  selector: 'app-mis-pagos',
   imports: [CommonModule, FormsModule,PatientSidebarComponent],
  standalone: true,
  templateUrl: './pagosP.component.html',
  styleUrls: ['./pagosP.component.css']
})
export class MisPagosComponent implements OnInit {
  pagos: Pago[] = [];

  pagosFiltrados: Pago[] = [];
  activeFilter: string = 'Todos';
  searchQuery: string = '';
  estadisticas: EstadisticasPagos = {
    totalPagado: 0,
    completados: 0,
    pendientes: 0,
    fallidos: 0
  };
  cargando: boolean = false;

  constructor(
    private sanitizer: DomSanitizer,
    private pagosService: PagosService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPagosFromServer();
  }

  private loadPagosFromServer(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.error('Usuario no autenticado');
      return;
    }

    this.cargando = true;
    this.pagosService.getPagosByPaciente(user.usuario_id).subscribe(
      (rows: PagoBackend[]) => {
        const mapped = (rows || []).map((r: PagoBackend) => ({
          id: r.pago_id ? String(r.pago_id) : String(Math.random()),
          monto: typeof r.monto === 'string' ? parseFloat(String(r.monto)) : (r.monto || 0),
          estado: (r.estado || 'pendiente').toString().toLowerCase() === 'completado' ? 'Completado' : (r.estado ? String(r.estado) : 'Pendiente'),
          descripcion: r.descripcion || '',
          transaccion: r.transaccion || (r.factura_id ? String(r.factura_id) : ''),
          metodo: r.metodo || '',
          fecha: r.fecha || r.creado_en || '',
          factura: r.factura_id || '',
          medico: r.medico_nombre || '',
          fechaCita: r.fecha || '',
          motivo: r.descripcion || ''
        } as Pago));

        this.pagos = mapped;
        this.updateStats();
        this.filterPayments();
        this.cargando = false;
      },
      (err) => {
        console.error('Error obteniendo pagos desde backend', err);
        this.cargando = false;
      }
    );
  }

  updateStats(): void {
    this.estadisticas = {
      totalPagado: this.pagos
        .filter(p => p.estado === 'Completado')
        .reduce((sum, p) => sum + p.monto, 0),
      completados: this.pagos.filter(p => p.estado === 'Completado').length,
      pendientes: this.pagos.filter(p => p.estado === 'Pendiente').length,
      fallidos: this.pagos.filter(p => p.estado === 'Fallido').length
    };
  }

  filterPayments(): void {
    this.pagosFiltrados = this.pagos.filter(pago => {
      const matchesFilter =
        this.activeFilter === 'Todos' ||
        (this.activeFilter === 'Completados' && pago.estado === 'Completado') ||
        (this.activeFilter === 'Pendientes' && pago.estado === 'Pendiente') ||
        (this.activeFilter === 'Fallidos' && pago.estado === 'Fallido');

      const matchesSearch =
        pago.descripcion.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        pago.transaccion.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        pago.factura.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        pago.medico.toLowerCase().includes(this.searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterPayments();
  }

  onSearch(): void {
    this.filterPayments();
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'Completado':
        return 'status-completado';
      case 'Pendiente':
        return 'status-pendiente';
      case 'Fallido':
        return 'status-fallido';
      default:
        return 'status-completado';
    }
  }

  getStatusIcon(estado: string): SafeHtml {
    let icon = '';
    switch (estado) {
      case 'Completado':
        icon = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>`;
        break;
      case 'Pendiente':
        icon = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>`;
        break;
      case 'Fallido':
        icon = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
        break;
    }
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  descargarFactura(pago: Pago): void {
    console.log('📥 Descargando factura:', pago.factura);

    // Crear contenido de texto plano como en la imagen
    const contenidoFactura = `FACTURA: INV-${pago.id}
Fecha: ${new Date().toLocaleDateString('es-ES')}
----------------------------------------
Paciente: Sofia Martinez
Médico: Dr. Carlos Ramirez
----------------------------------------
Descripción: ${pago.descripcion || 'Consulta médica'}
Monto: $${pago.monto}
Método de pago: ${pago.metodo || 'tarjeta credito'}
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

  // Métodos públicos para uso externo
  addPago(pago: Pago): void {
    this.pagos.unshift(pago);
    this.updateStats();
    this.filterPayments();
  }

  getPagos(): Pago[] {
    return this.pagos;
  }

  getPagoById(id: string): Pago | undefined {
    return this.pagos.find(p => p.id === id);
  }

  getTotalPagado(): number {
    return this.pagos
      .filter(p => p.estado === 'Completado')
      .reduce((sum, p) => sum + p.monto, 0);
  }
}
