import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/nav/navbar.component';
import { PatientSidebarComponent } from '../../../barraLateral/paciente/Barrap.component';
import { ModalCitaComponent } from './ModalAgendar/agendarP.component';
import { AppointmentService } from '../../../services/appointment.service';
import { AuthService } from '../../../services/auth.service';

interface PacienteCita {
    nombre: string;
    telefono: string;
}

interface MedicoCita {
    nombre: string;
    especialidad: string;
}

interface Cita {
    id: string;
    estado: 'En Progreso' | 'Completada' | 'Pendiente' | 'Confirmada' | 'Cancelada';
    motivo: string;
    paciente: PacienteCita;
    medico: MedicoCita;
    fecha: string;
    hora: string;
    modalidad: 'Videollamada' | 'Chat de texto';
    sintomas: string;
    notas: string;
}

interface Stats {
    total: number;
    pendientes: number;
    confirmadas: number;
    completadas: number;
    canceladas: number;
}

interface CitaCreada {
    paciente: string;
    medico: string;
    fecha: string;
    hora: string;
    tipoConsulta: 'Chat de Texto' | 'Videollamada';
    motivo: string;
    sintomas: string;
    tipoSangre: string;
    direccion: string;
    contactoEmergencia: string;
    telefonoEmergencia: string;
    notas: string;
}

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientSidebarComponent, ModalCitaComponent],
  templateUrl: './citas.component.html',
  styleUrls: ['./citas.component.css']
})
export class CitasComponent implements OnInit {
  citas: Cita[] = [];

  activeFilter: string = 'Todas';
  searchQuery: string = '';
  stats: Stats = {
    total: 0,
    pendientes: 0,
    confirmadas: 0,
    completadas: 0,
    canceladas: 0
  };

  // Estado del modal
  showModal: boolean = false;

  // Ya no necesitas estas listas porque los campos ahora son inputs de texto
  pacientes: string[] = [];
  medicos: string[] = [];

  ngOnInit(): void {
    console.log('🎯 CitasComponent.ngOnInit iniciado');

    // Siempre refrescar desde el servidor cuando entras a la página de Agenda
    this.appointmentService.getAppointments().subscribe({
      next: (appointments) => {
        console.log('✅ Citas refrescadas desde servidor:', appointments);
      },
      error: (err) => {
        console.error('❌ Error refrescando citas:', err);
      }
    });

    // Escuchar cambios en tiempo real desde el AppointmentService
    this.appointmentService.appointments$.subscribe((appointments: any[]) => {
      console.log('🔄 Cambios en appointments$ detectados:', appointments);
      if (appointments && appointments.length > 0) {
        this.citas = appointments.map(a => ({
          id: a.cita_id ? `${a.cita_id}` : `${Date.now()}`,
          estado: a.estado === 'pendiente' || a.estado === 'Pendiente' ? 'Pendiente' : (a.estado === 'confirmada' || a.estado === 'Confirmada' ? 'Confirmada' : (a.estado === 'completada' || a.estado === 'Completada' ? 'Completada' : (a.estado === 'cancelada' || a.estado === 'Cancelada' ? 'Cancelada' : a.estado))),
          motivo: a.motivo || '',
          paciente: {
            nombre: a.paciente_nombre || a.paciente_name || `ID:${a.paciente_id}`,
            telefono: a.paciente_telefono || ''
          },
          medico: {
              nombre: a.medico_nombre || a.medico_name || `ID:${a.medico_id}`,
              especialidad: a.medico_especialidad || ''
          },
          fecha: a.fecha_cita ? this.formatDate(a.fecha_cita) : (a.fecha || ''),
          hora: a.hora_cita || a.hora || '',
          modalidad: this.mapModalidad(a.modalidad),
          sintomas: a.sintomas || a.sintomas_cita || '',
          notas: a.notas || a.notas_cita || ''
        } as Cita));

        // Ordenar por cita_id (número de cita) de forma descendente
        this.citas.sort((a, b) => {
          const idA = parseInt(a.id, 10) || 0;
          const idB = parseInt(b.id, 10) || 0;
          return idB - idA;
        });

        console.log('📋 Citas mapeadas y ordenadas:', this.citas);
        this.updateStats();
      } else {
        console.log('⚠️ No hay citas en el BehaviorSubject');
        this.citas = [];
        this.updateStats();
      }
    });
  }

  constructor(private appointmentService: AppointmentService, private authService: AuthService) {}

  private loadAppointments(): void {
    // Este método ya no es necesario porque ngOnInit llama getAppointments() directamente
  }

  updateStats(): void {
    this.stats = {
      total: this.citas.length,
      pendientes: this.citas.filter(c => c.estado === 'Pendiente').length,
      confirmadas: this.citas.filter(c => c.estado === 'Confirmada').length,
      completadas: this.citas.filter(c => c.estado === 'Completada').length,
      canceladas: this.citas.filter(c => c.estado === 'Cancelada').length
    };
  }

  get filteredCitas(): Cita[] {
    return this.citas.filter(cita => {
      const matchesFilter = this.activeFilter === 'Todas' ||
                           (this.activeFilter === 'Pendientes' && cita.estado === 'Pendiente') ||
                           (this.activeFilter === 'Confirmadas' && cita.estado === 'Confirmada') ||
                           (this.activeFilter === 'Canceladas' && cita.estado === 'Cancelada') ||
                           (this.activeFilter === 'En Progreso' && cita.estado === 'En Progreso') ||
                           (this.activeFilter === 'Completadas' && cita.estado === 'Completada');

      const matchesSearch = cita.motivo.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           cita.id.toLowerCase().includes(this.searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'En Progreso':
        return 'status-badge-green';
      case 'Completada':
        return 'status-badge-blue';
      case 'Cancelada':
        return 'status-badge-red';
      case 'Pendiente':
        return 'status-badge-yellow';
      case 'Confirmada':
        return 'status-badge-green';
      default:
        return 'status-badge-blue';
    }
  }

  unirseVideollamada(cita: Cita): void {
    console.log('📞 Uniéndose a videollamada de la cita:', cita.id);

    // Abrir videollamada en nueva ventana - usar mismo formato que consultas
    const roomId = `consulta-${cita.id}`;
    const url = `/videollamada?room=${roomId}&citaId=${cita.id}&tipo=paciente`;

    window.open(url, '_blank', 'width=1200,height=800');
  }

  // Métodos del modal
  openModal(): void {
    console.log('Abriendo modal...');
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    console.log('Método closeModal ejecutado en citas.component');
    this.showModal = false;
    document.body.style.overflow = 'auto';
  }

  onCitaCreada(citaData: CitaCreada): void {
    // Crear payload para backend
    const user = this.authService.getCurrentUser();
    const payload: any = {
      paciente_id: user ? user.id : null,
      // intentar extraer medico id si el campo viene como 'ID:123' o sólo número
      medico_id: isNaN(Number(citaData.medico)) ? undefined : Number(citaData.medico),
      medico_nombre: citaData.medico,
      fecha_cita: citaData.fecha,
      hora_cita: citaData.hora,
      motivo: citaData.motivo,
      sintomas: citaData.sintomas || null,
      notas: citaData.notas || null,
      modalidad: citaData.tipoConsulta === 'Chat de Texto' ? 'texto' : 'video',
      estado: 'pendiente'
    };

    // Llamada al backend para crear la cita
    this.appointmentService.createAppointment(payload).subscribe({
      next: (res) => {
        console.log('Cita creada en backend:', res);
        // Refrescar la lista de citas desde el servidor
        this.appointmentService.getAppointments().subscribe();
        alert('¡Cita creada exitosamente!');
      },
      error: (err) => {
        console.error('Error creando cita en backend:', err);
        // Como fallback, añadirla localmente para visibilidad inmediata
        const nuevaCita: Cita = {
          id: `CITA-${Date.now()}`,
          estado: 'Pendiente',
          motivo: citaData.motivo,
          paciente: {
            nombre: citaData.paciente,
            telefono: citaData.telefonoEmergencia || '+52 55 0000 0000'
          },
          medico: {
            nombre: citaData.medico,
            especialidad: 'Especialidad'
          },
          fecha: this.formatDate(citaData.fecha),
          hora: citaData.hora,
          modalidad: citaData.tipoConsulta === 'Chat de Texto' ? 'Chat de texto' : 'Videollamada',
          sintomas: citaData.sintomas,
          notas: citaData.notas
        };
        this.citas.unshift(nuevaCita);
        this.updateStats();
        alert('La cita se agregó localmente pero hubo un error al guardarla en el servidor.');
      }
    });
  }

  private mapModalidad(value: any): 'Videollamada' | 'Chat de texto' {
    if (!value) return 'Videollamada';
    const v = String(value).toLowerCase();
    if (v.includes('texto') || v.includes('chat')) return 'Chat de texto';
    if (v.includes('video') || v.includes('videollamada')) return 'Videollamada';
    return 'Videollamada';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
  }

  addCita(cita: Cita): void {
    this.citas.push(cita);
    this.updateStats();
  }

  updateCita(id: string, updatedCita: Partial<Cita>): void {
    const index = this.citas.findIndex(c => c.id === id);
    if (index !== -1) {
      this.citas[index] = { ...this.citas[index], ...updatedCita };
      this.updateStats();
    }
  }

  deleteCita(id: string): void {
    this.citas = this.citas.filter(c => c.id !== id);
    this.updateStats();
  }
}
