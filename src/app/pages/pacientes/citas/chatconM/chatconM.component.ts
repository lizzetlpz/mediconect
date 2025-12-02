import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientSidebarComponent } from '../../../../barraLateral/paciente/Barrap.component';

interface ConsultaMedica {
    id: string;
    motivo: string;
    estado: 'En progreso' | 'Pendiente' | 'Finalizada';
    modalidad: 'Video' | 'Chat';
    paciente: string;
    medico: string;
    especialidad: string;
    fecha: string;
    hora: string;
    mensajes: Mensaje[];
}

interface Mensaje {
    id: string;
    texto: string;
    remitente: 'paciente' | 'medico';
    nombre: string;
    iniciales: string;
    timestamp: string;
}

@Component({
    selector: 'app-consultas-paciente',
    standalone: true,
    imports: [CommonModule, FormsModule, PatientSidebarComponent],
    templateUrl: './chatconM.component.html',
    styleUrls: ['./chatconM.component.css']
})
export class ConsultasPacienteComponent implements OnInit, AfterViewChecked {
    @ViewChild('chatMessages') private chatMessagesRef?: ElementRef;

    // Nombre del paciente (debería venir de un servicio de autenticación)
    pacienteActual = 'Juan Pérez';

    consultas: ConsultaMedica[] = [
        {
            id: '1',
            motivo: 'Consulta de control post-operatorio',
            estado: 'En progreso',
            modalidad: 'Chat',
            paciente: 'Juan Pérez',
            medico: 'Dra. María González',
            especialidad: 'Cardiología',
            fecha: '26/11/2024',
            hora: '10:30',
            mensajes: [
                {
                    id: '1',
                    texto: 'Buenos días doctora, ¿cómo está?',
                    remitente: 'paciente',
                    nombre: 'Juan Pérez',
                    iniciales: 'JP',
                    timestamp: '10:30'
                },
                {
                    id: '2',
                    texto: 'Buenos días Juan. Muy bien, gracias. ¿Cómo te has sentido después de la operación?',
                    remitente: 'medico',
                    nombre: 'Dra. María González',
                    iniciales: 'MG',
                    timestamp: '10:31'
                },
                {
                    id: '3',
                    texto: 'Me he sentido mucho mejor, el dolor ha disminuido considerablemente',
                    remitente: 'paciente',
                    nombre: 'Juan Pérez',
                    iniciales: 'JP',
                    timestamp: '10:32'
                },
                {
                    id: '4',
                    texto: 'Excelente. ¿Has tomado los medicamentos como te indiqué?',
                    remitente: 'medico',
                    nombre: 'Dra. María González',
                    iniciales: 'MG',
                    timestamp: '10:33'
                }
            ]
        },
        {
            id: '2',
            motivo: 'Revisión de resultados de laboratorio',
            estado: 'Pendiente',
            modalidad: 'Video',
            paciente: 'Juan Pérez',
            medico: 'Dr. Carlos Ramírez',
            especialidad: 'Medicina General',
            fecha: '28/11/2024',
            hora: '15:00',
            mensajes: []
        },
        {
            id: '3',
            motivo: 'Consulta por dolor de espalda',
            estado: 'Finalizada',
            modalidad: 'Chat',
            paciente: 'Juan Pérez',
            medico: 'Dr. Luis Hernández',
            especialidad: 'Traumatología',
            fecha: '20/11/2024',
            hora: '16:00',
            mensajes: [
                {
                    id: '1',
                    texto: 'Doctor, tengo dolor en la espalda baja desde hace 3 días',
                    remitente: 'paciente',
                    nombre: 'Juan Pérez',
                    iniciales: 'JP',
                    timestamp: '16:00'
                },
                {
                    id: '2',
                    texto: 'Entiendo. ¿El dolor empeora con algún movimiento en particular?',
                    remitente: 'medico',
                    nombre: 'Dr. Luis Hernández',
                    iniciales: 'LH',
                    timestamp: '16:02'
                }
            ]
        }
    ];

    consultaActiva: ConsultaMedica | null = null;
    searchQuery: string = '';
    nuevoMensaje: string = '';
    private shouldScrollToBottom = false;

    constructor() {}

    ngOnInit(): void {
        // Seleccionar automáticamente la primera consulta activa si existe
        const primeraActiva = this.consultas.find(c => c.estado === 'En progreso');
        if (primeraActiva) {
            this.consultaActiva = primeraActiva;
            this.shouldScrollToBottom = true;
        }
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    get filteredConsultas(): ConsultaMedica[] {
        if (!this.searchQuery) {
            return this.consultas;
        }

        const query = this.searchQuery.toLowerCase();
        return this.consultas.filter(consulta => {
            return (
                consulta.motivo.toLowerCase().includes(query) ||
                consulta.medico.toLowerCase().includes(query) ||
                consulta.especialidad.toLowerCase().includes(query)
            );
        });
    }

    selectConsulta(consulta: ConsultaMedica): void {
        this.consultaActiva = consulta;
        this.shouldScrollToBottom = true;
    }

    isConsultaActive(consulta: ConsultaMedica): boolean {
        return this.consultaActiva?.id === consulta.id;
    }

    getStatusClass(estado: string): string {
        return `status-${estado.toLowerCase().replace(' ', '-')}`;
    }

    getModalityIcon(modalidad: string): string {
        return modalidad === 'Video' ? 'video' : 'chat';
    }

    getMedicoIniciales(nombre: string): string {
        return nombre.split(' ').map(n => n[0]).join('').slice(0, 2);
    }

    sendMessage(): void {
        if (!this.nuevoMensaje.trim() || !this.consultaActiva) return;

        // Verificar que la consulta esté en progreso
        if (this.consultaActiva.estado !== 'En progreso') {
            alert('No puedes enviar mensajes en una consulta que no está en progreso');
            return;
        }

        const mensaje: Mensaje = {
            id: Date.now().toString(),
            texto: this.nuevoMensaje.trim(),
            remitente: 'paciente',
            nombre: this.pacienteActual,
            iniciales: this.pacienteActual.split(' ').map(n => n[0]).join('').slice(0, 2),
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };

        this.consultaActiva.mensajes.push(mensaje);
        this.nuevoMensaje = '';
        this.shouldScrollToBottom = true;
    }

    onKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    private scrollToBottom(): void {
        try {
            if (this.chatMessagesRef) {
                this.chatMessagesRef.nativeElement.scrollTop =
                    this.chatMessagesRef.nativeElement.scrollHeight;
            }
        } catch (err) {
            console.error('Error scrolling to bottom:', err);
        }
    }

    canSendMessage(): boolean {
        return this.consultaActiva?.estado === 'En progreso';
    }

    getEstadoDescripcion(estado: string): string {
        switch (estado) {
            case 'En progreso':
                return 'Puedes enviar mensajes ahora';
            case 'Pendiente':
                return 'La consulta aún no ha comenzado';
            case 'Finalizada':
                return 'Esta consulta ha finalizado';
            default:
                return '';
        }
    }

    getConsultas(): ConsultaMedica[] {
        return this.consultas;
    }

    getConsultaActiva(): ConsultaMedica | null {
        return this.consultaActiva;
    }
}
