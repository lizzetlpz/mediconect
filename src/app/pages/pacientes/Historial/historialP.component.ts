import { Component, OnInit, ViewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientSidebarComponent } from '../../../barraLateral/paciente/Barrap.component';
import { NavbarComponent } from '../../../components/navbar/nav/navbar.component';
import { detallesComponent } from '../Historial/detalles/detalles.component';
import { RegistroComponent } from "../Historial/AgregarR/AgregarR.component";
import { HistorialService, HistorialMedico } from '../../../services/historialM.service';
import { AuthService } from '../../../services/auth.service';

interface HistorialRecord {
    id: string;
    motivo: string;
    fecha: string;
    paciente: string | null;
    medico: string | null;
    sintomas: string;
    diagnostico: string;
    medicamentos: Medicamento[];
    fotoReceta?: string;
    estudios?: Estudio[];
}

interface Medicamento {
    nombre: string;
    tipo: 'primary' | 'secondary';
}

interface Estudio {
    nombre: string;
    tipo?: string;
    descripcion?: string;
}

@Component({
    selector: 'app-historial-p',
    standalone: true,
    imports: [CommonModule, FormsModule, PatientSidebarComponent, RegistroComponent, detallesComponent],
    templateUrl: './historialP.component.html',
    styleUrls: ['./historialP.component.css']
})
export class HistorialPComponent implements OnInit {
    @ViewChild('modalDetalles') modalDetalles!: detallesComponent;
    registros: HistorialRecord[] = [];
    cargando: boolean = false;
    errorCarga: string | null = null;

    searchQuery: string = '';
    registroSeleccionado: HistorialRecord | null = null;
    mostrarModalRegistro: boolean = false;

    constructor(private historialService: HistorialService, private authService: AuthService) {}

    ngOnInit(): void {
        this.loadHistorialDelPaciente();
    }

    private loadHistorialDelPaciente(): void {
        const user = this.authService.getCurrentUser();
        if (!user) {
            this.errorCarga = 'Usuario no autenticado';
            return;
        }

        this.cargando = true;
        this.historialService.obtenerHistorialPaciente(user.id).subscribe({
            next: (items: HistorialMedico[]) => {
                this.registros = (items || []).map(i => ({
                    id: i.historial_id ? String(i.historial_id) : String(Date.now()),
                    motivo: i.motivo_consulta || i.diagnostico || 'Sin motivo',
                    fecha: i.fecha_consulta || i.creado_en || '',
                    paciente: i.paciente_nombre ? `${i.paciente_nombre} ${i.paciente_apellido_paterno || ''}`.trim() : null,
                    medico: i.doctor_nombre ? `${i.doctor_nombre} ${i.doctor_apellido_paterno || ''}`.trim() : null,
                    sintomas: i.sintomas || '',
                    diagnostico: i.diagnostico || '',
                    medicamentos: (i.medicamentos || []).map(m => ({ nombre: m.nombre, tipo: 'primary' as 'primary' })),
                    fotoReceta: (i as any).foto_receta || null,
                    estudios: (i.estudios || []).map(e => ({
                        nombre: e.nombre,
                        tipo: e.tipo || '',
                        descripcion: e.descripcion || ''
                    }))
                }));
                this.cargando = false;
                this.errorCarga = null;
            },
            error: (err) => {
                console.error('Error cargando historial paciente', err);
                this.errorCarga = 'Error al obtener historial';
                this.cargando = false;
            }
        });
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
        if (record) {
            // Convertir HistorialRecord a RegistroMedico
            const registroMedico: any = {
                id: record.id,
                titulo: record.motivo,
                paciente: record.paciente || 'Paciente no encontrado',
                medico: record.medico || 'Médico no encontrado',
                fecha: new Date(record.fecha),
                sintomas: record.sintomas,
                diagnostico: record.diagnostico,
                planTratamiento: 'Seguir tratamiento indicado y acudir a consulta de seguimiento.',
                medicamentos: record.medicamentos.map(med => ({
                    nombre: med.nombre,
                    dosis: 'Según indicación médica',
                    frecuencia: 'Ver receta',
                    duracion: 'Según prescripción',
                    instrucciones: 'Seguir indicaciones del médico'
                })),
                fechaSeguimiento: new Date(new Date(record.fecha).getTime() + 15 * 24 * 60 * 60 * 1000),
                notasMedico: 'Registro de consulta médica.',
                fotoReceta: record.fotoReceta || null,
                estudios: record.estudios || []
            };

            this.registroSeleccionado = record;

            setTimeout(() => {
                if (this.modalDetalles && this.modalDetalles.abrir) {
                    this.modalDetalles.abrir(registroMedico);
                }
            });
        }
    }

    // Métodos para el modal de Agregar Registro
    abrirModalRegistro(): void {
        console.log('Abriendo modal de registro...');
        this.mostrarModalRegistro = true;
        document.body.style.overflow = 'hidden';
    }

    cerrarModalRegistro(): void {
        console.log('Cerrando modal de registro...');
        this.mostrarModalRegistro = false;
        document.body.style.overflow = 'auto';
    }

    onRegistroCreado(nuevoRegistro: HistorialRecord): void {
        // Generar ID único
        nuevoRegistro.id = `${Date.now()}`;

        // Agregar al inicio de la lista
        this.registros.unshift(nuevoRegistro);

        console.log('Registro agregado:', nuevoRegistro);
        alert('¡Registro médico creado exitosamente!');
    }

    addRecord(record: HistorialRecord): void {
        this.registros.unshift(record);
    }

    getRecords(): HistorialRecord[] {
        return this.registros;
    }

    getRecordById(id: string): HistorialRecord | undefined {
        return this.registros.find(r => r.id === id);
    }

    deleteRecord(id: string): void {
        this.registros = this.registros.filter(r => r.id !== id);
    }
}
