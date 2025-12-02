import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientSidebarComponent } from '../../../barraLateral/paciente/Barrap.component';
import { Router } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { AuthService } from '../../../services/auth.service';
import { DoctorsService, DoctorItem, DoctorProfile } from '../../../services/doctors.service';
import { AgendarCitaModalComponent } from './modal-agendarM/modalAgendar.component';
import { ModalPagoComponent } from './pagos/pagos.component'; // Agregar import

interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
  experiencia: number;
  rating: number;
  consultorio: string;
  disponibilidad: string;
  precio: number;
  foto: string;
  descripcion: string;
  ubicacion: string;
}

@Component({
  selector: 'app-buscar-medico',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PatientSidebarComponent,
    AgendarCitaModalComponent,
    ModalPagoComponent // Agregar aquí
  ],
  templateUrl: './BuscarMedicoP.component.html',
  styleUrls: ['./BuscarMedicoP.component.css']
})
export class BuscarMedicoComponent implements OnInit {
  @ViewChild('modalAgendarCita') modalAgendarCita!: AgendarCitaModalComponent;
  @ViewChild(ModalPagoComponent, { static: false }) modalPago!: ModalPagoComponent; // Agregar

  medicos: Medico[] = [];

  searchQuery: string = '';
  especialidadFiltro: string = 'Todas';
  medicoSeleccionado: Medico | null = null;
  citaActual: any = null; // Agregar para guardar la cita antes de pagar

  especialidades: string[] = [
    'Todas',
    'Cardiología',
    'Medicina General',
    'Pediatría',
    'Dermatología',
    'Neurología',
    'Traumatología',
    'Ginecología'
  ];

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private doctorsService: DoctorsService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const token = this.authService.getToken();
    console.log('🔐 BuscarMedicoP.ngOnInit - Usuario:', user);
    console.log('🔐 BuscarMedicoP.ngOnInit - Token presente:', !!token);
    this.loadDoctorsFromServer();
  }

  private loadDoctorsFromServer(): void {
    console.log('📡 Llamando GET /api/medicos/profiles...');
    this.doctorsService.getAllDoctorsWithProfiles().subscribe({
      next: (rows: DoctorProfile[]) => {
        console.log('✅ Perfiles de médicos recibidos desde backend:', rows);
        // Map DB doctors to local Medico interface with complete profile data
        this.medicos = (rows || []).map(r => ({
          id: String(r.usuario_id),
          nombre: r.nombre + (r.apellido_paterno ? ' ' + r.apellido_paterno : ''),
          especialidad: r.especialidad || 'Medicina General',
          experiencia: r.anos_experiencia || 0,
          rating: 4.5, // Valor por defecto, podrías implementar un sistema de rating
          consultorio: r.universidad || 'Consultorio Virtual',
          disponibilidad: 'Disponible',
          precio: parseFloat(r.tarifa_consulta || '100'),
          foto: '', // Podrías agregar campo de foto en el futuro
          descripcion: r.descripcion || 'Médico profesional con cédula: ' + (r.cedula_profesional || 'N/A'),
          ubicacion: r.universidad || 'Virtual'
        }));
        console.log('📊 Médicos mapeados para UI:', this.medicos);
        
        // Actualizar especialidades dinámicamente
        this.updateEspecialidades();
      },
      error: (err) => {
        console.error('❌ Error cargando medicos desde backend:', err);
        console.error('   Status:', err.status);
        console.error('   Message:', err.message);
        if (err.error) {
          console.error('   Error body:', err.error);
        }
      }
    });
  }

  private updateEspecialidades(): void {
    // Obtener especialidades únicas de los médicos cargados
    const especialidadesUnicas = [...new Set(this.medicos.map(m => m.especialidad))];
    
    // Mantener "Todas" al inicio y agregar las especialidades reales
    this.especialidades = ['Todas', ...especialidadesUnicas.filter(e => e !== 'Todas')];
    
    console.log('📋 Especialidades actualizadas:', this.especialidades);
  }

  get medicosFiltrados(): Medico[] {
    console.log('🔍 Filtrando médicos. Total:', this.medicos.length, 'Filtro especialidad:', this.especialidadFiltro, 'Query:', this.searchQuery);
    return this.medicos.filter(medico => {
      const matchesSearch =
        medico.nombre.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        medico.especialidad.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        medico.consultorio.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        medico.ubicacion.toLowerCase().includes(this.searchQuery.toLowerCase());

      // Si especialidadFiltro es "Todas" O si la especialidad del médico es genérica ("Médico"), mostrar
      // Esto permite que los médicos sin especialidad definida en BD aparezcan con cualquier filtro
      const matchesEspecialidad =
        this.especialidadFiltro === 'Todas' ||
        medico.especialidad === 'Médico' || // Mostrar médicos genéricos siempre
        medico.especialidad === this.especialidadFiltro;

      return matchesSearch && matchesEspecialidad;
    });
  }

  convertirMedicoADoctor(medico: Medico): any {
    return {
      id: medico.id,
      nombre: medico.nombre,
      especialidad: medico.especialidad,
      descripcion: medico.descripcion,
      precio: medico.precio,
      foto: medico.foto
    };
  }

  abrirModal(medico: Medico): void {
    this.medicoSeleccionado = medico;
    setTimeout(() => {
      if (this.modalAgendarCita) {
        this.modalAgendarCita.abrir();
      }
    });
  }

  onCitaAgendada(datosCita: any): void {
    console.log('Cita agendada:', datosCita);

    // El modal interno ya procesó el pago y emitió la cita agendada.
    // Persistir la cita directamente en el backend y refrescar la agenda.
    this.citaActual = datosCita;

    const user = this.authService.getCurrentUser();
    const pacienteId = user ? user.usuario_id : null;

    const payload: any = {
      paciente_id: pacienteId,
      medico_id: Number(datosCita.doctorId),
      medico_nombre: datosCita.doctorNombre || (this.medicoSeleccionado && this.medicoSeleccionado.nombre),
      fecha_cita: datosCita.fecha,
      hora_cita: datosCita.hora,
      motivo: datosCita.motivoConsulta,
      sintomas: datosCita.sintomas || null,
      notas: datosCita.notasAdicionales || null,
      modalidad: datosCita.tipoConsulta === 'texto' ? 'texto' : 'video',
      estado: 'pendiente'
    };

    this.appointmentService.createAppointment(payload).subscribe({
      next: (res) => {
        console.log('Cita creada en backend (desde BuscarMedico):', res);
        this.appointmentService.getAppointments().subscribe();
        alert('¡Cita pagada y guardada en tu agenda!');
        this.medicoSeleccionado = null;
        this.citaActual = null;
      },
      error: (err) => {
        console.error('Error creando cita despues del pago:', err);
        alert('La cita fue pagada pero hubo un error al guardarla en el servidor.');
      }
    });
  }

  onPagoCompletado(datosPago: any): void {
    console.log('Pago completado:', datosPago);
    console.log('Cita registrada:', this.citaActual);

    // Persistir la cita en el backend
    const user = this.authService.getCurrentUser();
    const pacienteId = user ? user.usuario_id : null;

    if (!this.citaActual) {
      alert('No hay cita para confirmar');
      return;
    }

    const payload: any = {
      paciente_id: pacienteId,
      medico_id: Number(this.citaActual.doctorId),
      medico_nombre: this.citaActual.doctorNombre || (this.medicoSeleccionado && this.medicoSeleccionado.nombre),
      fecha_cita: this.citaActual.fecha,
      hora_cita: this.citaActual.hora,
      motivo: this.citaActual.motivoConsulta,
      sintomas: this.citaActual.sintomas || null,
      notas: this.citaActual.notasAdicionales || null,
      modalidad: this.citaActual.tipoConsulta === 'texto' ? 'texto' : 'video',
      estado: 'pendiente',
      // Agregar email del pago para notificaciones
      email_notificacion: datosPago.email_notificacion || null
    };

    this.appointmentService.createAppointment(payload).subscribe({
      next: (res) => {
        console.log('Cita creada en backend:', res);
        alert(`¡Pago y cita confirmados!\nTransacción: ${datosPago.transaccionId}`);
        // Refrescar lista de citas en la app
        this.appointmentService.getAppointments().subscribe();
        // Limpiar variables
        this.medicoSeleccionado = null;
        this.citaActual = null;
      },
      error: (err) => {
        console.error('Error guardando cita en backend:', err);
        alert('La cita fue pagada pero ocurrió un error al guardarla en el servidor.');
      }
    });
  }

  onPagoCancelado(): void {
    console.log('Pago cancelado');
    this.citaActual = null;
  }

  agendarCita(medicoId: string): void {
    const medico = this.medicos.find(m => m.id === medicoId);
    if (medico) {
      this.abrirModal(medico);
    }
  }

  verPerfil(medicoId: string): void {
    console.log('Ver perfil del médico:', medicoId);
    alert('Función de ver perfil en desarrollo');
  }

  getRatingStars(rating: number): string[] {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars: string[] = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push('full');
    }
    if (hasHalfStar) {
      stars.push('half');
    }
    while (stars.length < 5) {
      stars.push('empty');
    }

    return stars;
  }
}
