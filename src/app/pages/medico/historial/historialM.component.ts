import { Component, OnInit, ViewChild, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/nav/navbar.component';
import { DoctorSidebarComponent } from '../../../barraLateral/doctor/BarraD.component';
import { CrearRegistroComponent } from './agregarR/agregarR.component';
import { MedicalDetailComponent, RegistroMedico } from './modaldetalles/modaldeta.component';
import { HistorialService, HistorialMedico } from '../../../services/historialM.service';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute } from '@angular/router';

interface HistorialRecord {
    id: string;
    motivo: string;
    fecha: string;
    paciente: string | null;
    medico: string | null;
    sintomas: string;
    diagnostico: string;
    medicamentos: Medicamento[];
}

interface Medicamento {
    nombre: string;
    tipo: 'primary' | 'secondary';
}

@Component({
    selector: 'app-historial-p',
    standalone: true,
    imports: [CommonModule, NavbarComponent, FormsModule, DoctorSidebarComponent, CrearRegistroComponent, MedicalDetailComponent],
    templateUrl: './historialM.component.html',
    styleUrls: ['./historialM.component.css']
})
export class HistorialPComponent implements OnInit, AfterViewInit {
    @ViewChild(MedicalDetailComponent, { static: false }) modalDetalles!: MedicalDetailComponent;
    @Input() pacienteId?: number;

    mostrarModal: boolean = false;
    registros: HistorialRecord[] = [];
    searchQuery: string = '';
    isLoading: boolean = false;
    pacienteIdActual: number = 0;
    esDoctor: boolean = false;

    constructor(
        private historialService: HistorialService,
        private authService: AuthService,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser) {
            console.error('❌ No hay usuario autenticado');
            return;
        }

        console.log('👤 Usuario actual:', currentUser);
        console.log('🔑 Rol ID:', currentUser.rol_id);
        console.log('🆔 Usuario ID:', currentUser.id);

        // Verificar si es doctor
        this.esDoctor = currentUser.rol_id === 3;

        // Determinar qué historial cargar
        if (this.pacienteId) {
            // Si se pasó un pacienteId como @Input
            this.pacienteIdActual = this.pacienteId;
            console.log('📋 Cargando historial del paciente (Input):', this.pacienteIdActual);
            this.cargarHistorial(this.pacienteIdActual);
        } else if (currentUser.rol_id === 2) {
            // Si es paciente, cargar su propio historial
            this.pacienteIdActual = currentUser.id;
            console.log('👨‍⚕️ Es PACIENTE - Cargando su historial con ID:', this.pacienteIdActual);
            this.cargarHistorial(this.pacienteIdActual);
        } else if (currentUser.rol_id === 3) {
            // Si es doctor, verificar si hay un pacienteId en la ruta
            const pacienteIdParam = this.route.snapshot.paramMap.get('pacienteId');
            if (pacienteIdParam) {
                this.pacienteIdActual = parseInt(pacienteIdParam);
                console.log('👨‍⚕️ Es DOCTOR - Cargando historial del paciente:', this.pacienteIdActual);
                this.cargarHistorial(this.pacienteIdActual);
            } else {
                // ✅ NUEVO: Doctor sin paciente específico - cargar TODOS sus historiales
                console.log('👨‍⚕️ Es DOCTOR - Cargando TODOS los historiales creados por él');
                this.cargarTodosLosHistorialesDelDoctor(currentUser.id);
            }
        }
    }

    ngAfterViewInit(): void {
        console.log('Modal disponible:', this.modalDetalles);
    }

    // ✅ NUEVA FUNCIÓN: Cargar todos los historiales del doctor
    cargarTodosLosHistorialesDelDoctor(doctorId: number): void {
        this.isLoading = true;
        console.log('📋 Cargando TODOS los historiales del doctor:', doctorId);

        this.historialService.obtenerHistorialesDoctor(doctorId).subscribe({
            next: (historiales: HistorialMedico[]) => {
                console.log('✅ Historiales del doctor obtenidos:', historiales);

                this.registros = historiales.map(hist => this.convertirHistorialMedicoARecord(hist));

                console.log('📊 Registros procesados:', this.registros);

                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error cargando historiales del doctor:', error);
                this.isLoading = false;
                this.registros = [];
            }
        });
    }

    cargarHistorial(pacienteId: number): void {
        if (!pacienteId || pacienteId === 0) {
            console.warn('⚠️ pacienteId no válido:', pacienteId);
            return;
        }

        this.isLoading = true;
        console.log('📋 Cargando historial del paciente:', pacienteId);

        this.historialService.obtenerHistorialPaciente(pacienteId).subscribe({
            next: (historiales: HistorialMedico[]) => {
                console.log('✅ Historiales obtenidos:', historiales);

                this.registros = historiales.map(hist => this.convertirHistorialMedicoARecord(hist));

                console.log('📊 Registros procesados:', this.registros);

                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error cargando historial:', error);
                console.error('   Status:', error.status);
                console.error('   Message:', error.message);

                this.isLoading = false;
                this.registros = [];
            }
        });
    }

    private convertirHistorialMedicoARecord(hist: HistorialMedico): HistorialRecord {
        const medicamentos: Medicamento[] = [];

        // Agregar medicamentos como primary
        if (hist.medicamentos && Array.isArray(hist.medicamentos)) {
            hist.medicamentos.forEach(med => {
                const nombreCompleto = [
                    med.nombre,
                    med.dosis,
                    med.frecuencia
                ].filter(Boolean).join(' - ');

                medicamentos.push({
                    nombre: nombreCompleto,
                    tipo: 'primary'
                });
            });
        }

        // Agregar seguimiento como secondary si aplica
        if (hist.requiere_seguimiento) {
            medicamentos.push({
                nombre: 'Requiere seguimiento',
                tipo: 'secondary'
            });
        }

        return {
            id: hist.historial_id?.toString() || '',
            motivo: hist.motivo_consulta || 'Sin motivo especificado',
            fecha: this.formatearFecha(hist.fecha_consulta),
            paciente: hist.paciente_nombre && hist.paciente_apellido_paterno
                ? `${hist.paciente_nombre} ${hist.paciente_apellido_paterno}`
                : null,
            medico: hist.doctor_nombre && hist.doctor_apellido_paterno
                ? `Dr. ${hist.doctor_nombre} ${hist.doctor_apellido_paterno}`
                : null,
            sintomas: hist.sintomas || 'Sin síntomas especificados',
            diagnostico: hist.diagnostico || 'Sin diagnóstico especificado',
            medicamentos: medicamentos
        };
    }

    private formatearFecha(fechaISO: string): string {
        try {
            const fecha = new Date(fechaISO);
            return fecha.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Fecha no disponible';
        }
    }

    get filteredRecords(): HistorialRecord[] {
        if (!this.searchQuery) {
            return this.registros;
        }

        const query = this.searchQuery.toLowerCase();
        return this.registros.filter(record => {
            return (
                record.motivo.toLowerCase().includes(query) ||
                record.diagnostico.toLowerCase().includes(query) ||
                record.sintomas.toLowerCase().includes(query) ||
                (record.paciente && record.paciente.toLowerCase().includes(query)) ||
                (record.medico && record.medico.toLowerCase().includes(query))
            );
        });
    }

    onSearchChange(query: string): void {
        this.searchQuery = query;
    }

    verDetalles(recordId: string): void {
        const record = this.registros.find(r => r.id === recordId);
        if (record && this.modalDetalles) {
            console.log('Abriendo detalles del registro:', record);

            const registroMedico: RegistroMedico = {
                id: record.id,
                titulo: record.motivo,
                paciente: record.paciente || 'Paciente no especificado',
                medico: record.medico || 'Dr. No especificado',
                fecha: this.convertirFecha(record.fecha),
                sintomas: record.sintomas,
                diagnostico: record.diagnostico,
                planTratamiento: 'Ver plan de tratamiento completo',
                medicamentos: record.medicamentos
                    .filter(m => m.tipo === 'primary')
                    .map(m => {
                        const partes = m.nombre.split(' - ');
                        return {
                            nombre: partes[0] || '',
                            dosis: partes[1] || '',
                            frecuencia: partes[2] || '',
                            duracion: '',
                            instrucciones: ''
                        };
                    }),
                fechaSeguimiento: new Date(),
                notasMedico: 'Ver notas completas en el sistema'
            };

            this.modalDetalles.abrir(registroMedico);
        }
    }

    private convertirFecha(fechaStr: string): Date {
        const meses: { [key: string]: number } = {
            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
            'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
            'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };

        const partes = fechaStr.split(' ');
        if (partes.length >= 4) {
            const dia = parseInt(partes[0]);
            const mes = meses[partes[2].toLowerCase()];
            const año = parseInt(partes[3]);
            return new Date(año, mes, dia);
        }

        return new Date();
    }

    onRegistroCreado(): void {
        console.log('✅ Registro creado, recargando lista...');

        const currentUser = this.authService.getCurrentUser();

        if (currentUser && currentUser.rol_id === 3) {
            // Si es doctor, recargar todos sus historiales
            this.cargarTodosLosHistorialesDelDoctor(currentUser.id);
        } else if (this.pacienteIdActual && this.pacienteIdActual !== 0) {
            // Si es paciente o hay un paciente específico
            this.cargarHistorial(this.pacienteIdActual);
        }

        this.mostrarModal = false;
    }

    deleteRecord(id: string): void {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            this.historialService.eliminarHistorial(parseInt(id)).subscribe({
                next: () => {
                    console.log('✅ Registro eliminado');

                    const currentUser = this.authService.getCurrentUser();

                    if (currentUser && currentUser.rol_id === 3) {
                        this.cargarTodosLosHistorialesDelDoctor(currentUser.id);
                    } else {
                        this.cargarHistorial(this.pacienteIdActual);
                    }

                    alert('Registro eliminado exitosamente');
                },
                error: (error) => {
                    console.error('❌ Error eliminando registro:', error);
                    alert('Error al eliminar el registro');
                }
            });
        }
    }
}
