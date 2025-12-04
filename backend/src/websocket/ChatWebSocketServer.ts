import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { getConnection } from '../../BD/SQLite/database';

interface UsuarioConectado {
  id: number;
  socket: WebSocket;
  rol: 'paciente' | 'medico';
  nombre: string;
  consultaId?: number;
}

interface MensajeChat {
  id?: number;
  consultaId: number;
  texto: string;
  remitente: 'paciente' | 'medico';
  remitenteId: number;
  nombre: string;
  timestamp: Date;
  leido: boolean;
}

export class ChatWebSocketServer {
  private wss: WebSocketServer;
  private usuariosConectados = new Map<number, UsuarioConectado>();
  private consultasActivas = new Map<number, Set<number>>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/chat'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('🔌 Servidor WebSocket de chat iniciado en el mismo servidor HTTP');
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    console.log('👤 Nueva conexión WebSocket');

    socket.on('message', async (data) => {
      try {
        const mensaje = JSON.parse(data.toString());
        await this.procesarMensaje(socket, mensaje);
      } catch (error) {
        console.error('❌ Error procesando mensaje WebSocket:', error);
        this.enviarError(socket, 'Error procesando mensaje');
      }
    });

    socket.on('close', () => {
      this.handleDisconnection(socket);
    });

    socket.on('error', (error) => {
      console.error('❌ Error en WebSocket:', error);
    });
  }

  private async procesarMensaje(socket: WebSocket, mensaje: any): Promise<void> {
    switch (mensaje.tipo) {
      case 'identificar':
        await this.identificarUsuario(socket, mensaje);
        break;
      case 'unirse_consulta':
        await this.unirseAConsulta(socket, mensaje);
        break;
      case 'salir_consulta':
        this.salirDeConsulta(socket, mensaje);
        break;
      case 'nuevo_mensaje':
        await this.procesarNuevoMensaje(socket, mensaje);
        break;
      default:
        this.enviarError(socket, `Tipo de mensaje no reconocido: ${mensaje.tipo}`);
    }
  }

  private async identificarUsuario(socket: WebSocket, mensaje: any): Promise<void> {
    try {
      const { usuarioId, rol } = mensaje;
      const pool = getConnection();
      const [usuarios] = await pool.query(
        'SELECT nombre, apellido_paterno FROM usuarios WHERE usuario_id = ?',
        [usuarioId]
      );

      if (!Array.isArray(usuarios) || usuarios.length === 0) {
        this.enviarError(socket, 'Usuario no encontrado');
        return;
      }

      const usuario = (usuarios as any[])[0];
      const nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno}`;

      this.usuariosConectados.set(usuarioId, {
        id: usuarioId,
        socket: socket,
        rol: rol,
        nombre: nombreCompleto
      });

      console.log(`✅ Usuario identificado: ${nombreCompleto} (${rol})`);

      socket.send(JSON.stringify({
        tipo: 'identificado',
        usuario: { id: usuarioId, nombre: nombreCompleto, rol }
      }));
    } catch (error) {
      console.error('❌ Error identificando usuario:', error);
      this.enviarError(socket, 'Error al identificar usuario');
    }
  }

  private async unirseAConsulta(socket: WebSocket, mensaje: any): Promise<void> {
    try {
      const { consultaId, usuarioId } = mensaje;
      const usuario = this.usuariosConectados.get(usuarioId);

      if (!usuario) {
        this.enviarError(socket, 'Usuario no identificado');
        return;
      }

      usuario.consultaId = consultaId;

      if (!this.consultasActivas.has(consultaId)) {
        this.consultasActivas.set(consultaId, new Set());
      }
      this.consultasActivas.get(consultaId)!.add(usuarioId);

      console.log(`👥 ${usuario.nombre} se unió a la consulta ${consultaId}`);

      let mensajesFormateados: any[] = [];

      // Intentar cargar historial de mensajes de la base de datos
      try {
        const pool = getConnection();
        const [mensajes] = await pool.query(
          `SELECT m.*, u.nombre, u.apellido_paterno,
           IF(u.rol_id = 3, 'medico', 'paciente') as remitente
           FROM mensajes_chat m
           JOIN usuarios u ON m.remitente_id = u.usuario_id
           WHERE m.consulta_id = ?
           ORDER BY m.timestamp ASC`,
          [consultaId]
        );

        mensajesFormateados = (mensajes as any[]).map(m => ({
          id: m.mensaje_id,
          consultaId: m.consulta_id,
          texto: m.mensaje,
          remitente: m.remitente,
          remitenteId: m.remitente_id,
          nombre: `${m.nombre} ${m.apellido_paterno}`,
          timestamp: m.timestamp,
          leido: m.leido === 1
        }));

        console.log(`📚 Enviando ${mensajesFormateados.length} mensajes del historial`);
      } catch (dbError: any) {
        console.warn('⚠️ No se pudo cargar historial (tabla no existe?):', dbError.message);
        // Continuar sin historial
      }

      socket.send(JSON.stringify({
        tipo: 'historial_mensajes',
        mensajes: mensajesFormateados
      }));
    } catch (error) {
      console.error('❌ Error uniéndose a consulta:', error);
      this.enviarError(socket, 'Error al unirse a la consulta');
    }
  }

  private salirDeConsulta(socket: WebSocket, mensaje: any): void {
    const { consultaId, usuarioId } = mensaje;
    const usuario = this.usuariosConectados.get(usuarioId);

    if (usuario) {
      usuario.consultaId = undefined;

      if (this.consultasActivas.has(consultaId)) {
        this.consultasActivas.get(consultaId)!.delete(usuarioId);
        if (this.consultasActivas.get(consultaId)!.size === 0) {
          this.consultasActivas.delete(consultaId);
        }
      }

      console.log(`👋 ${usuario.nombre} salió de la consulta ${consultaId}`);
    }
  }

  private async procesarNuevoMensaje(socket: WebSocket, data: any): Promise<void> {
    try {
      const mensajeData = data.mensaje;

      console.log('💬 Procesando nuevo mensaje:', {
        consultaId: mensajeData.consultaId,
        texto: mensajeData.texto,
        remitente: mensajeData.remitente,
        remitenteId: mensajeData.remitenteId,
        nombre: mensajeData.nombre
      });

      let mensajeId = Date.now();

      // Intentar guardar mensaje en la base de datos
      try {
        const pool = getConnection();
        const [result] = await pool.query(
          `INSERT INTO mensajes_chat (consulta_id, remitente_id, mensaje, timestamp, leido)
           VALUES (?, ?, ?, NOW(), 0)`,
          [mensajeData.consultaId, mensajeData.remitenteId, mensajeData.texto]
        );
        mensajeId = (result as any).insertId;
        console.log('💾 Mensaje guardado en BD con ID:', mensajeId);
      } catch (dbError: any) {
        console.warn('⚠️ No se pudo guardar en BD (tabla no existe?):', dbError.message);
        // Continuar sin guardar en BD
      }

      const mensajeCompleto: MensajeChat = {
        id: mensajeId,
        consultaId: mensajeData.consultaId,
        texto: mensajeData.texto,
        remitente: mensajeData.remitente,
        remitenteId: mensajeData.remitenteId,
        nombre: mensajeData.nombre,
        timestamp: new Date(),
        leido: false
      };

      console.log('📤 Enviando mensaje a participantes de consulta', mensajeData.consultaId);
      const participantes = this.consultasActivas.get(mensajeData.consultaId);
      console.log('👥 Participantes en consulta:', participantes ? Array.from(participantes) : 'ninguno');

      this.enviarAConsulta(mensajeData.consultaId, {
        tipo: 'nuevo_mensaje',
        mensaje: mensajeCompleto
      });

      console.log('✅ Mensaje enviado correctamente');
    } catch (error) {
      console.error('❌ Error procesando nuevo mensaje:', error);
      this.enviarError(socket, 'Error al enviar mensaje');
    }
  }

  private enviarAConsulta(consultaId: number, data: any): void {
    const participantes = this.consultasActivas.get(consultaId);
    console.log(`📡 Enviando a consulta ${consultaId}:`, {
      data: data,
      participantes: participantes ? Array.from(participantes) : 'ninguno',
      totalParticipantes: participantes?.size || 0
    });

    if (participantes) {
      participantes.forEach(usuarioId => {
        const usuario = this.usuariosConectados.get(usuarioId);
        if (usuario && usuario.socket.readyState === WebSocket.OPEN) {
          console.log(`📨 Enviando mensaje a usuario ${usuarioId} (${usuario.nombre})`);
          usuario.socket.send(JSON.stringify(data));
        } else {
          console.log(`⚠️ Usuario ${usuarioId} no conectado o socket cerrado`);
        }
      });
    } else {
      console.log(`⚠️ No hay participantes en consulta ${consultaId}`);
    }
  }

  private enviarError(socket: WebSocket, mensaje: string): void {
    socket.send(JSON.stringify({
      tipo: 'error',
      mensaje: mensaje
    }));
  }

  private handleDisconnection(socket: WebSocket): void {
    for (const [usuarioId, usuario] of this.usuariosConectados.entries()) {
      if (usuario.socket === socket) {
        console.log(`👋 Usuario ${usuario.nombre} desconectado`);

        if (usuario.consultaId) {
          this.salirDeConsulta(socket, {
            consultaId: usuario.consultaId,
            usuarioId: usuarioId
          });
        }

        this.usuariosConectados.delete(usuarioId);
        break;
      }
    }
  }

  public getEstadisticas(): any {
    return {
      usuariosConectados: this.usuariosConectados.size,
      consultasActivas: this.consultasActivas.size
    };
  }
}
