import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/nav/navbar.component';
import { DoctorSidebarComponent } from '../../../barraLateral/doctor/BarraD.component';
import { CitasService, CitaMedica } from '../../../services/citas.service';
import { ChatService, MensajeChat } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

interface ConsultaMedica {
    id: number;
    motivo: string;
    estado: 'en_progreso' | 'pendiente' | 'confirmada' | 'completada';
    modalidad: 'video' | 'texto' | 'videollamada';
    paciente: {
        nombre: string;
        telefono?: string;
    };
    medico: {
        nombre: string;
        especialidad?: string;
    };
    fecha: string;
    hora: string;
    sintomas?: string;
    notas?: string;
    mensajes?: Mensaje[];
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
    selector: 'app-consultas-medicas',
    standalone: true,
    imports: [CommonModule, FormsModule, DoctorSidebarComponent],
    templateUrl: './consultasM.component.html',
    styleUrls: ['./consultasM.component.css']
})
export class ConsultasMedicasComponent implements OnInit, AfterViewChecked, OnDestroy {
    @ViewChild('chatMessages') private chatMessagesRef?: ElementRef;

    consultas: ConsultaMedica[] = [];
    consultaActiva: ConsultaMedica | null = null;
    searchQuery: string = '';
    nuevoMensaje: string = '';
    loading: boolean = false;
    error: string = '';

    // Chat en tiempo real
    mensajes: MensajeChat[] = [];
    chatConectado: boolean = false;
    usuarioActual: any = null;

    private shouldScrollToBottom = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private citasService: CitasService,
        private chatService: ChatService,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        this.cargarDatosUsuario();
        this.cargarConsultas();
        this.configurarChatService();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.chatService.salirDeConsulta();
    }

    private cargarDatosUsuario(): void {
        this.usuarioActual = this.authService.getCurrentUser();
    }

    private configurarChatService(): void {
        console.log('🎧 ========================================');
        console.log('🎧 CONFIGURANDO SUSCRIPCIONES DE CHAT (MÉDICO)');
        console.log('🎧 ========================================');

        // Suscribirse a los mensajes del chat
        const mensajesSub = this.chatService.getMensajes().subscribe(mensajes => {
            console.log('📬 SUSCRIPCIÓN getMensajes() ACTIVADA');
            console.log('📬 Mensajes recibidos en suscripción:', mensajes.length);
            console.log('📬 Mensajes:', JSON.stringify(mensajes, null, 2));
            this.mensajes = mensajes;
            this.shouldScrollToBottom = true;
            console.log('📬 this.mensajes actualizado, longitud:', this.mensajes.length);
        });

        // Suscribirse al estado de conexión
        const conexionSub = this.chatService.getEstadoConexion().subscribe(conectado => {
            console.log('🔌 Estado de conexión WebSocket:', conectado);
            this.chatConectado = conectado;
        });

        this.subscriptions.push(mensajesSub, conexionSub);
        console.log('✅ Suscripciones configuradas correctamente');
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    cargarConsultas(): void {
        this.loading = true;
        this.error = '';

        this.citasService.obtenerCitasMedico().subscribe({
            next: (citas: CitaMedica[]) => {
                console.log('📋 Citas cargadas para consultas:', citas);
                // Filtrar SOLO las citas en progreso (iniciadas)
                const citasActivas = citas.filter(cita =>
                    cita.estado === 'en_progreso'
                );

                // Transformar las citas reales a formato de consulta
                this.consultas = citasActivas.map((cita: any) => this.transformarCitaAConsulta(cita));
                this.loading = false;

                if (this.consultas.length === 0) {
                    console.log('ℹ️ No hay consultas activas (en progreso) disponibles');
                }
            },
            error: (error: any) => {
                console.error('❌ Error cargando consultas:', error);
                this.error = 'Error al cargar las consultas. Por favor, intenta de nuevo.';
                this.loading = false;
            }
        });
    }

    private transformarCitaAConsulta(cita: any): ConsultaMedica {
        // Formatear fecha para mostrar
        let fechaFormateada = cita.fecha;
        if (cita.fecha_cita) {
            const fecha = new Date(cita.fecha_cita);
            fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }

        return {
            id: cita.id || cita.cita_id,
            motivo: cita.motivo || 'Consulta médica',
            estado: cita.estado,
            modalidad: cita.modalidad || 'texto',
            paciente: {
                nombre: cita.paciente?.nombre || `${cita.paciente_nombre || ''} ${cita.paciente_apellido || ''}`.trim() || 'Paciente',
                telefono: cita.paciente?.telefono || cita.paciente_telefono
            },
            medico: {
                nombre: cita.medico?.nombre || `${cita.medico_nombre || ''} ${cita.medico_apellido || ''}`.trim() || 'Médico',
                especialidad: cita.medico?.especialidad || cita.medico_especialidad
            },
            fecha: fechaFormateada,
            hora: cita.hora || cita.hora_cita || '00:00',
            sintomas: cita.sintomas,
            notas: cita.notas,
            mensajes: [] // Se inicializará cuando se seleccione la consulta
        };
    }

    get filteredConsultas(): ConsultaMedica[] {
        if (!this.searchQuery) {
            return this.consultas;
        }

        const query = this.searchQuery.toLowerCase();
        return this.consultas.filter(consulta => {
            return (
                consulta.motivo.toLowerCase().includes(query) ||
                consulta.paciente.nombre.toLowerCase().includes(query) ||
                consulta.medico.nombre.toLowerCase().includes(query)
            );
        });
    }

    selectConsulta(consulta: ConsultaMedica): void {
        console.log('🔗 ========================================');
        console.log('🔗 MÉDICO SELECCIONANDO CONSULTA');
        console.log('🔗 ========================================');
        console.log('🔗 Consulta completa:', JSON.stringify(consulta, null, 2));
        console.log('🔗 ID de consulta (cita):', consulta.id);
        console.log('🔗 Estado:', consulta.estado);
        console.log('🔗 Paciente:', consulta.paciente.nombre);
        console.log('🔗 Modalidad:', consulta.modalidad);
        console.log('🔗 Usuario actual (médico):', {
            id: this.usuarioActual?.id,
            nombre: this.usuarioActual?.nombre,
            rol: this.usuarioActual?.rol
        });

        // Salir de la consulta anterior si existe
        if (this.consultaActiva) {
            console.log('🚪 Saliendo de consulta anterior');
            this.chatService.salirDeConsulta();
        }

        this.consultaActiva = consulta;
        this.shouldScrollToBottom = true;

        console.log('📡 Llamando chatService.unirseAConsulta con ID:', consulta.id);
        // Unirse a la nueva consulta en tiempo real
        this.chatService.unirseAConsulta(consulta.id);

        // Cambiar el estado a "en progreso" si está confirmada
        if (consulta.estado === 'confirmada') {
            console.log('📝 Actualizando estado de consulta a en_progreso');
            this.actualizarEstadoConsulta(consulta.id, 'en_progreso');
        }

        console.log(`✅ Médico conectado a consulta ${consulta.id}`);
    }

    isConsultaActive(consulta: ConsultaMedica): boolean {
        return this.consultaActiva?.id === consulta.id;
    }

    getStatusClass(estado: string): string {
        switch (estado) {
            case 'en_progreso':
                return 'status-en-progreso';
            case 'pendiente':
                return 'status-pendiente';
            case 'confirmada':
                return 'status-confirmada';
            default:
                return 'status-pendiente';
        }
    }

    getModalityIcon(modalidad: string): string {
        return (modalidad === 'video' || modalidad === 'videollamada') ? 'video' : 'chat';
    }

    getPacienteIniciales(nombre: string): string {
        return nombre.split(' ').map(n => n[0]).join('').slice(0, 2);
    }

    sendMessage(): void {
        if (!this.nuevoMensaje.trim() || !this.consultaActiva || !this.usuarioActual) {
            return;
        }

        // Enviar mensaje a través del chat service
        const nombreCompleto = `${this.usuarioActual.nombre} ${this.usuarioActual.apellido_paterno}`;
        this.chatService.enviarMensaje(this.nuevoMensaje, nombreCompleto);

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

    actualizarEstadoConsulta(consultaId: number, nuevoEstado: string): void {
        this.citasService.actualizarEstadoCita(consultaId, nuevoEstado).subscribe({
            next: () => {
                // Actualizar la consulta en la lista local
                const consulta = this.consultas.find(c => c.id === consultaId);
                if (consulta) {
                    consulta.estado = nuevoEstado as any;
                }
            },
            error: (error) => {
                console.error('Error actualizando estado de consulta:', error);
                this.error = 'Error al actualizar el estado de la consulta.';
            }
        });
    }

    finalizarConsulta(): void {
        if (this.consultaActiva) {
            this.actualizarEstadoConsulta(this.consultaActiva.id, 'completada');
            this.chatService.salirDeConsulta();
            this.consultaActiva = null;
            this.cargarConsultas(); // Recargar para quitar la consulta completada
        }
    }

    // ============== FUNCIONALIDADES DE VIDEOLLAMADA ==============

    iniciarVideollamada(): void {
        if (this.consultaActiva && this.chatConectado) {
            console.log('📞 Iniciando videollamada para consulta:', this.consultaActiva.id);

            // Abrir videollamada en nueva ventana usando el mismo formato que el paciente
            const roomId = `consulta-${this.consultaActiva.id}`;
            const url = `/videollamada?room=${roomId}&consultaId=${this.consultaActiva.id}&tipo=doctor`;

            window.open(url, '_blank', 'width=1200,height=800');

            // Notificar al paciente que se está iniciando la videollamada
            this.chatService.iniciarVideollamada(this.consultaActiva.id);
        }
    }


    // ============== UTILIDADES ==============

    formatearTiempoMensaje(timestamp: Date): string {
        const fecha = new Date(timestamp);
        return fecha.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getIniciales(nombre: string): string {
        return nombre.split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }

    esVideollamada(consulta: ConsultaMedica): boolean {
        return consulta.modalidad === 'video' || consulta.modalidad === 'videollamada';
    }
}
