import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/nav/navbar.component';
import { DoctorSidebarComponent } from '../../../barraLateral/doctor/BarraD.component';
import { CitasService, CitaMedica, EstadisticasCitas } from '../../../services/citas.service';

@Component({
    selector: 'app-citas-medicas',
    standalone: true,
    imports: [CommonModule, FormsModule, DoctorSidebarComponent],
    templateUrl: './agendaM.component.html',
    styleUrls: ['./agendaM.component.css']
})
export class CitasMedicasComponent implements OnInit {
    citas: CitaMedica[] = [];
    stats: EstadisticasCitas = {
        total: 0,
        pendientes: 0,
        confirmadas: 0,
        completadas: 0,
        en_progreso: 0
    };

    activeFilter: string = 'Todas';
    searchQuery: string = '';
    loading: boolean = false;
    error: string = '';
    dropdownOpenId: number | null = null;

    constructor(private citasService: CitasService, private router: Router) {}

    ngOnInit(): void {
        this.cargarCitas();
        this.cargarEstadisticas();
    }

    cargarCitas(): void {
        this.loading = true;
        this.error = '';

        this.citasService.obtenerCitasMedico().subscribe({
            next: (citas) => {
                console.log('📅 Citas cargadas en agenda:', citas);
                // Procesar las citas para asegurar formato correcto
                this.citas = citas.map(cita => this.procesarCita(cita));
                this.loading = false;
                
                console.log(`✅ Total de citas procesadas: ${this.citas.length}`);
            },
            error: (error) => {
                console.error('❌ Error cargando citas:', error);
                this.error = 'Error al cargar las citas. Por favor, intenta de nuevo.';
                this.loading = false;
            }
        });
    }

    private procesarCita(cita: any): CitaMedica {
        // Formatear fecha si viene de la base de datos
        let fechaFormateada = cita.fecha;
        if (cita.fecha_cita) {
            const fecha = new Date(cita.fecha_cita);
            fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }

        return {
            ...cita,
            numero: cita.numero || `CITA-${cita.id}`,
            fecha_formateada: fechaFormateada,
            paciente: {
                nombre: cita.paciente?.nombre || `${cita.paciente_nombre || ''} ${cita.paciente_apellido || ''}`.trim() || 'Paciente',
                telefono: cita.paciente?.telefono || cita.paciente_telefono || ''
            },
            medico: {
                nombre: cita.medico?.nombre || `${cita.medico_nombre || ''} ${cita.medico_apellido || ''}`.trim() || 'Médico',
                especialidad: cita.medico?.especialidad || cita.medico_especialidad || ''
            }
        };
    }

    cargarEstadisticas(): void {
        this.citasService.obtenerEstadisticasMedico().subscribe({
            next: (estadisticas) => {
                this.stats = estadisticas;
            },
            error: (error) => {
                console.error('Error cargando estadísticas:', error);
            }
        });
    }

    get filteredCitas(): CitaMedica[] {
        return this.citas.filter(cita => {
            const matchesFilter =
                this.activeFilter === 'Todas' ||
                (this.activeFilter === 'Pendientes' && cita.estado === 'pendiente') ||
                (this.activeFilter === 'Confirmadas' && cita.estado === 'confirmada') ||
                (this.activeFilter === 'En Progreso' && cita.estado === 'en_progreso') ||
                (this.activeFilter === 'Completadas' && cita.estado === 'completada');

            const matchesSearch =
                cita.motivo.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                cita.paciente.nombre.toLowerCase().includes(this.searchQuery.toLowerCase());

            return matchesFilter && matchesSearch;
        });
    }

    setFilter(filter: string): void {
        this.activeFilter = filter;
    }

    // ============== MÉTODOS AUXILIARES ==============
    
    getCitaId(cita: any): number {
        return cita.id || cita.cita_id || 0;
    }
    
    getStatusClass(estado: string): string {
        switch (estado) {
            case 'en_progreso':
                return 'status-en-progreso';
            case 'completada':
                return 'status-completada';
            case 'pendiente':
                return 'status-pendiente';
            case 'confirmada':
                return 'status-confirmada';
            default:
                return 'status-pendiente';
        }
    }

    getModalityIcon(modalidad: string): string {
        if (modalidad === 'video' || modalidad === 'videollamada') {
            return 'video';
        } else {
            return 'chat';
        }
    }

    eliminarCita(citaId: number): void {
        if (confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
            this.citasService.eliminarCita(citaId).subscribe({
                next: () => {
                    this.citas = this.citas.filter(c => c.id !== citaId);
                    this.cargarEstadisticas();
                },
                error: (error) => {
                    console.error('Error eliminando cita:', error);
                    this.error = 'Error al eliminar la cita.';
                }
            });
        }
    }

    // ============== NUEVOS MÉTODOS DE GESTIÓN DE CITAS ==============
    
    toggleDropdown(citaId: number): void {
        this.dropdownOpenId = this.dropdownOpenId === citaId ? null : citaId;
    }

    confirmarCita(citaId: number): void {
        this.updateEstadoCita(citaId, 'confirmada');
        this.dropdownOpenId = null;
    }

    iniciarConsulta(citaId: number): void {
        this.updateEstadoCita(citaId, 'en_progreso');
        this.dropdownOpenId = null;
        
        // Navegar a la sección de consultas después de un pequeño delay
        setTimeout(() => {
            this.router.navigate(['/doctor/consultas']);
        }, 1000);
    }

    completarCita(citaId: number): void {
        if (confirm('¿Marcar esta cita como completada? Esto la moverá al historial.')) {
            this.updateEstadoCita(citaId, 'completada');
            this.dropdownOpenId = null;
        }
    }

    cancelarCita(citaId: number): void {
        if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
            this.updateEstadoCita(citaId, 'cancelada');
            this.dropdownOpenId = null;
        }
    }

    verHistorial(citaId: number): void {
        this.router.navigate(['/doctor/historiales']);
        this.dropdownOpenId = null;
    }

    private updateEstadoCita(citaId: number, nuevoEstado: string): void {
        console.log(`🔄 Actualizando cita ${citaId} a estado: ${nuevoEstado}`);
        
        this.citasService.actualizarEstadoCita(citaId, nuevoEstado).subscribe({
            next: () => {
                console.log(`✅ Cita ${citaId} actualizada a ${nuevoEstado}`);
                
                // Actualizar la cita en la lista local
                const cita = this.citas.find(c => (c.id || c.cita_id) === citaId);
                if (cita) {
                    cita.estado = nuevoEstado as any;
                }
                
                // Recargar las citas y estadísticas
                this.cargarCitas();
                this.cargarEstadisticas();
                
                // Mensaje de éxito
                const mensaje = {
                    'confirmada': 'Cita confirmada exitosamente',
                    'en_progreso': 'Consulta iniciada. Redirigiendo...',
                    'completada': 'Cita completada y movida al historial',
                    'cancelada': 'Cita cancelada'
                }[nuevoEstado];
                
                console.log('✅', mensaje);
            },
            error: (error) => {
                console.error('Error actualizando estado de cita:', error);
                this.error = 'Error al actualizar el estado de la cita.';
            }
        });
    }
}
