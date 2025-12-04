import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientSidebarComponent } from '../../../barraLateral/paciente/Barrap.component';
import { CitasService, CitaMedica } from '../../../services/citas.service';
import { ChatService, MensajeChat } from '../../../services/chat.service';
import { VideoCallService } from '../../../services/video-call.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

interface ConsultaPaciente {
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
}

@Component({
    selector: 'app-consultas-paciente',
    standalone: true,
    imports: [CommonModule, FormsModule, PatientSidebarComponent],
    templateUrl: './consultasP.component.html',
    styleUrls: ['./consultasP.component.css']
})
export class ConsultasPacienteComponent implements OnInit, AfterViewChecked, OnDestroy {
    @ViewChild('chatMessages') private chatMessagesRef?: ElementRef;

    consultas: ConsultaPaciente[] = [];
    consultaActiva: ConsultaPaciente | null = null;
    nuevoMensaje: string = '';
    loading: boolean = false;
    error: string = '';
    searchQuery: string = '';

    // Chat en tiempo real
    mensajes: MensajeChat[] = [];
    chatConectado: boolean = false;
    usuarioActual: any = null;

    private shouldScrollToBottom = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private citasService: CitasService,
        private chatService: ChatService,
        private videoCallService: VideoCallService,
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
        console.log('🎧 CONFIGURANDO SUSCRIPCIONES DE CHAT (PACIENTE)');
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

        console.log('🔄 Iniciando carga de consultas del paciente...');
        console.log('👤 Usuario actual:', this.usuarioActual);

        this.citasService.obtenerCitasPaciente().subscribe({
            next: (citas: CitaMedica[]) => {
                console.log('📋 Citas del paciente cargadas:', citas);

                // Filtrar citas confirmadas y en progreso para mostrar en consultas
                const citasActivas = citas.filter(cita =>
                    cita.estado === 'en_progreso' || cita.estado === 'confirmada'
                );

                console.log('📊 Citas activas filtradas:', citasActivas);

                this.consultas = citasActivas.map((cita: any) => this.transformarCitaAConsulta(cita));
                this.loading = false;

                console.log('✅ Consultas transformadas:', this.consultas);

                if (this.consultas.length === 0) {
                    console.log('ℹ️ No hay consultas activas disponibles para el paciente');
                }
            },
            error: (error: any) => {
                console.error('❌ Error cargando consultas del paciente:', error);
                this.error = 'Error al cargar las consultas. Por favor, intenta de nuevo.';
                this.loading = false;
            }
        });
    }

    private transformarCitaAConsulta(cita: any): ConsultaPaciente {
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
            notas: cita.notas
        };
    }

    selectConsulta(consulta: ConsultaPaciente): void {
        console.log('🔗 ========================================');
        console.log('🔗 PACIENTE SELECCIONANDO CONSULTA');
        console.log('🔗 ========================================');
        console.log('🔗 Consulta completa:', JSON.stringify(consulta, null, 2));
        console.log('🔗 ID de consulta (cita):', consulta.id);
        console.log('🔗 Estado:', consulta.estado);
        console.log('🔗 Médico:', consulta.medico.nombre);
        console.log('🔗 Modalidad:', consulta.modalidad);
        console.log('🔗 Usuario actual (paciente):', {
            id: this.usuarioActual?.id,
            nombre: this.usuarioActual?.nombre,
            rol: this.usuarioActual?.rol
        });

        // Salir de la consulta anterior si existe
        if (this.consultaActiva) {
            console.log('🚪 Saliendo de consulta anterior:', this.consultaActiva.id);
            this.chatService.salirDeConsulta();
        }

        this.consultaActiva = consulta;
        this.shouldScrollToBottom = true;

        // Limpiar mensajes anteriores
        this.mensajes = [];

        console.log('🔌 Conectando al chat...');
        console.log('📡 Llamando chatService.unirseAConsulta con ID:', consulta.id);
        // Unirse a la consulta en tiempo real
        this.chatService.unirseAConsulta(consulta.id);

        console.log(`✅ Paciente conectado a consulta ${consulta.id}`);
    }

    isConsultaActive(consulta: ConsultaPaciente): boolean {
        return this.consultaActiva?.id === consulta.id;
    }

    getStatusClass(estado: string): string {
        switch (estado) {
            case 'en_progreso':
                return 'status-en-progreso';
            case 'confirmada':
                return 'status-confirmada';
            case 'pendiente':
                return 'status-pendiente';
            default:
                return 'status-pendiente';
        }
    }

    getStatusText(estado: string): string {
        switch (estado) {
            case 'en_progreso':
                return 'En consulta';
            case 'confirmada':
                return 'Confirmada - Lista para iniciar';
            case 'pendiente':
                return 'Pendiente';
            default:
                return 'Pendiente';
        }
    }

    getModalityIcon(modalidad: string): string {
        return (modalidad === 'video' || modalidad === 'videollamada') ? 'video' : 'chat';
    }

    getMedicoIniciales(nombre: string): string {
        return nombre.split(' ').map(n => n[0]).join('').slice(0, 2);
    }

    sendMessage(): void {
        if (!this.nuevoMensaje.trim() || !this.consultaActiva || !this.usuarioActual) {
            console.warn('⚠️ No se puede enviar mensaje: faltan datos');
            return;
        }

        console.log('📤 Enviando mensaje desde componente:');
        console.log('  Mensaje:', this.nuevoMensaje);
        console.log('  Usuario:', this.usuarioActual);
        console.log('  Consulta activa:', this.consultaActiva.id);
        console.log('  Chat conectado:', this.chatConectado);

        // Enviar mensaje a través del chat service
        const nombreCompleto = `${this.usuarioActual.nombre} ${this.usuarioActual.apellido_paterno}`;

        this.chatService.enviarMensaje(this.nuevoMensaje, nombreCompleto);

        console.log('✅ Mensaje enviado, limpiando campo de texto');
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

    esVideollamada(consulta: ConsultaPaciente): boolean {
        return consulta.modalidad === 'video' || consulta.modalidad === 'videollamada';
    }

    unirseVideollamada(consulta: ConsultaPaciente): void {
        console.log('📞 Uniéndose a videollamada de la consulta:', consulta.id);

        // Abrir videollamada en nueva ventana
        const roomId = `consulta-${consulta.id}`;
        const url = `/videollamada?room=${roomId}&consultaId=${consulta.id}&tipo=paciente`;

        window.open(url, '_blank', 'width=1200,height=800');
    }

    puedeIniciarChat(): boolean {
        const puede = this.consultaActiva?.estado === 'en_progreso';
        console.log('🔍 puedeIniciarChat?', puede, 'Estado:', this.consultaActiva?.estado);
        return puede;
    }

    salirDeConsulta(): void {
        if (this.consultaActiva) {
            this.chatService.salirDeConsulta();
            this.consultaActiva = null;
            this.mensajes = [];
        }
    }

    // Getter computed para las consultas filtradas
    get consultasFiltradas(): ConsultaPaciente[] {
        if (!this.searchQuery.trim()) {
            return this.consultas;
        }

        const query = this.searchQuery.toLowerCase().trim();
        return this.consultas.filter(consulta =>
            consulta.medico.nombre.toLowerCase().includes(query) ||
            consulta.motivo.toLowerCase().includes(query) ||
            (consulta.medico.especialidad || '').toLowerCase().includes(query)
        );
    }

    // ============== VIDEOLLAMADAS ==============

    iniciarVideollamada(): void {
        if (!this.consultaActiva) {
            console.error('❌ No hay consulta activa para iniciar videollamada');
            return;
        }

        if (!this.usuarioActual?.usuario_id) {
            console.error('❌ No hay usuario activo para iniciar videollamada');
            return;
        }

        console.log('📹 Iniciando videollamada:', {
            consultaId: this.consultaActiva.id,
            usuarioId: this.usuarioActual.usuario_id,
            medico: this.consultaActiva.medico.nombre
        });

        this.videoCallService.startCall(
            this.consultaActiva.id,
            this.usuarioActual.usuario_id,
            'paciente'
        ).catch(error => {
            console.error('❌ Error iniciando videollamada:', error);
            alert('Error al iniciar la videollamada. Revisa los permisos de cámara y micrófono.');
        });
    }

    puedeIniciarVideollamada(): boolean {
        if (!this.consultaActiva) return false;

        return this.esVideollamada(this.consultaActiva) &&
               this.consultaActiva.estado === 'en_progreso' &&
               this.chatConectado;
    }

    onVideollamadaIniciada(): void {
        console.log('📹 Videollamada iniciada exitosamente');
    }

    onVideollamadaTerminada(): void {
        console.log('📹 Videollamada terminada');
    }
}
