import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface MensajeChat {
  id: string;
  consultaId: number;
  texto: string;
  remitente: 'paciente' | 'medico';
  remitenteId: number;
  nombre: string;
  timestamp: Date;
  leido: boolean;
}

export interface NotificacionChat {
  consultaId: number;
  pacienteId: number;
  medicoId: number;
  tipo: 'nuevo_mensaje' | 'consulta_iniciada' | 'consulta_finalizada';
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: WebSocket | null = null;
  private mensajesSubject = new BehaviorSubject<MensajeChat[]>([]);
  private notificacionesSubject = new BehaviorSubject<NotificacionChat | null>(null);
  private conectadoSubject = new BehaviorSubject<boolean>(false);

  private consultaActivaId: number | null = null;
  private usuarioId: number | null = null;
  private rol: string | null = null;

  constructor(private authService: AuthService) {
    this.inicializarDatosUsuario();
  }

  private inicializarDatosUsuario(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.usuarioId = user.id;
      this.rol = user.rol_id === 3 ? 'paciente' : 'medico'; // rol_id 3 = Paciente, rol_id 2 = Médico
      console.log('💾 Usuario inicializado en chat:', {
        usuarioId: this.usuarioId,
        rol: this.rol,
        rol_id: user.rol_id
      });
    } else {
      console.warn('⚠️ No se pudo obtener usuario actual para chat');
    }
  }

  // ============== CONEXIÓN WEBSOCKET ==============

  conectar(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('🔄 Ya conectado al WebSocket');
      return; // Ya está conectado
    }

    console.log('🔌 Intentando conectar a WebSocket...');
    const wsUrl = environment.wsUrl + '/chat';
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('🟢 Conectado al chat WebSocket');
      this.conectadoSubject.next(true);

      // Asegurar que tenemos datos de usuario
      if (!this.usuarioId || !this.rol) {
        this.inicializarDatosUsuario();
      }

      // Enviar identificación del usuario
      if (this.usuarioId && this.rol) {
        const identificacion = {
          tipo: 'identificar',
          usuarioId: this.usuarioId,
          rol: this.rol
        };
        console.log('👤 Enviando identificación:', identificacion);
        this.enviarMensajeSocket(identificacion);
      } else {
        console.error('❌ No se pudo identificar usuario en WebSocket');
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.procesarMensajeRecibido(data);
      } catch (error) {
        console.error('❌ Error procesando mensaje WebSocket:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('🔴 Desconectado del chat WebSocket');
      this.conectadoSubject.next(false);

      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        if (this.consultaActivaId) {
          this.conectar();
        }
      }, 5000);
    };

    this.socket.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error);
      this.conectadoSubject.next(false);
    };
  }

  desconectar(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.consultaActivaId = null;
    this.conectadoSubject.next(false);
  }

  // ============== GESTIÓN DE CONSULTAS ==============

  unirseAConsulta(consultaId: number): void {
    console.log('🏥 ========================================');
    console.log('🏥 UNIRSE A CONSULTA');
    console.log('🏥 ========================================');
    console.log('🏥 Intentando unirse a consulta:', {
      consultaId,
      socketConectado: this.socket?.readyState === WebSocket.OPEN,
      usuarioId: this.usuarioId,
      rol: this.rol,
      socketReadyState: this.socket?.readyState,
      OPEN: WebSocket.OPEN,
      CONNECTING: WebSocket.CONNECTING,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED
    });

    this.consultaActivaId = consultaId;

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log('🔌 Socket no conectado, conectando primero...');
      this.conectar();

      // Esperar a que se conecte y luego unirse
      setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          console.log('📤 Socket conectado, enviando solicitud de unión...');
          this.enviarMensajeSocket({
            tipo: 'unirse_consulta',
            consultaId: consultaId,
            usuarioId: this.usuarioId
          });
        } else {
          console.error('❌ No se pudo conectar al WebSocket después de 2 segundos');
        }
      }, 2000);
    } else {
      console.log('📤 Socket ya conectado, enviando solicitud de unión inmediatamente...');
      this.enviarMensajeSocket({
        tipo: 'unirse_consulta',
        consultaId: consultaId,
        usuarioId: this.usuarioId
      });
    }
  }

  salirDeConsulta(): void {
    if (this.consultaActivaId && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.enviarMensajeSocket({
        tipo: 'salir_consulta',
        consultaId: this.consultaActivaId,
        usuarioId: this.usuarioId
      });
    }

    this.consultaActivaId = null;
    this.mensajesSubject.next([]);
    this.desconectar();
  }

  // ============== ENVÍO DE MENSAJES ==============

  enviarMensaje(texto: string, nombre: string): void {
    console.log('📤 Intentando enviar mensaje:', {
      texto: texto,
      nombre: nombre,
      consultaId: this.consultaActivaId,
      usuarioId: this.usuarioId,
      rol: this.rol,
      socketState: this.socket?.readyState
    });

    if (!this.consultaActivaId) {
      console.warn('⚠️ No hay consulta activa');
      return;
    }

    if (!texto.trim()) {
      console.warn('⚠️ Texto de mensaje vacío');
      return;
    }

    if (!this.usuarioId || !this.rol) {
      console.warn('⚠️ Faltan datos de usuario:', { usuarioId: this.usuarioId, rol: this.rol });
      // Reintentar inicializar datos
      this.inicializarDatosUsuario();
      if (!this.usuarioId || !this.rol) {
        console.error('❌ No se pudieron inicializar datos de usuario');
        return;
      }
    }

    // Crear mensaje local temporal
    const mensajeLocal: MensajeChat = {
      id: 'temp-' + Date.now(),
      consultaId: this.consultaActivaId,
      texto: texto.trim(),
      remitente: this.rol as 'paciente' | 'medico',
      remitenteId: this.usuarioId,
      nombre: nombre,
      timestamp: new Date(),
      leido: false
    };

    console.log('📝 Agregando mensaje local temporalmente:', mensajeLocal);

    // Agregar mensaje inmediatamente a la lista local
    const mensajesActuales = this.mensajesSubject.value;
    this.mensajesSubject.next([...mensajesActuales, mensajeLocal]);

    const mensaje: Partial<MensajeChat> = {
      consultaId: this.consultaActivaId,
      texto: texto.trim(),
      remitente: this.rol as 'paciente' | 'medico',
      remitenteId: this.usuarioId,
      nombre: nombre,
      timestamp: new Date()
    };

    console.log('📨 Mensaje preparado para enviar:', mensaje);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = {
        tipo: 'nuevo_mensaje',
        mensaje: mensaje
      };
      console.log('📡 Enviando a WebSocket:', payload);
      this.enviarMensajeSocket(payload);
    } else {
      console.error('❌ WebSocket no conectado:', {
        socketExists: !!this.socket,
        readyState: this.socket?.readyState,
        OPEN: WebSocket.OPEN
      });

      // Intentar reconectar
      console.log('🔄 Intentando reconectar...');
      this.conectar();
    }
  }

  private enviarMensajeSocket(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  // ============== PROCESAMIENTO DE MENSAJES ==============

  private procesarMensajeRecibido(data: any): void {
    console.log('📬 Mensaje recibido del WebSocket:', data);

    switch (data.tipo) {
      case 'historial_mensajes':
        console.log('📄 Cargando historial de mensajes:', data.mensajes?.length || 0, 'mensajes');
        this.mensajesSubject.next(data.mensajes || []);
        break;

      case 'nuevo_mensaje':
        console.log('💬 Nuevo mensaje recibido:', data.mensaje);
        const mensajesActuales = this.mensajesSubject.value;

        // Evitar duplicados removiendo mensaje temporal si existe
        const mensajesFiltrados = mensajesActuales.filter(m =>
          !m.id?.toString().startsWith('temp-') ||
          m.texto !== data.mensaje.texto ||
          m.remitenteId !== data.mensaje.remitenteId
        );

        this.mensajesSubject.next([...mensajesFiltrados, data.mensaje]);
        console.log('📋 Total de mensajes ahora:', this.mensajesSubject.value.length);
        break;

      case 'identificado':
        console.log('👤 Usuario identificado en WebSocket:', data.usuario);
        break;

      case 'notificacion':
        console.log('🔔 Notificación recibida:', data.notificacion);
        this.notificacionesSubject.next(data.notificacion);
        break;

      case 'error':
        console.error('❌ Error del servidor WebSocket:', data.mensaje);
        break;

      default:
        console.log('📨 Mensaje WebSocket no manejado:', data);
    }
  }

  // ============== OBSERVABLES PÚBLICOS ==============

  getMensajes(): Observable<MensajeChat[]> {
    return this.mensajesSubject.asObservable();
  }

  getNotificaciones(): Observable<NotificacionChat | null> {
    return this.notificacionesSubject.asObservable();
  }

  getEstadoConexion(): Observable<boolean> {
    return this.conectadoSubject.asObservable();
  }

  getConsultaActiva(): number | null {
    return this.consultaActivaId;
  }

  // ============== UTILIDADES ==============

  marcarMensajesComoLeidos(consultaId: number): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.enviarMensajeSocket({
        tipo: 'marcar_leidos',
        consultaId: consultaId,
        usuarioId: this.usuarioId
      });
    }
  }

  iniciarVideollamada(consultaId: number): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.enviarMensajeSocket({
        tipo: 'iniciar_videollamada',
        consultaId: consultaId,
        usuarioId: this.usuarioId
      });
    }
  }

  finalizarVideollamada(consultaId: number): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.enviarMensajeSocket({
        tipo: 'finalizar_videollamada',
        consultaId: consultaId,
        usuarioId: this.usuarioId
      });
    }
  }
}
