import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VideoCallState {
  isInCall: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  connectionState: RTCPeerConnectionState;
  remoteVideoStream?: MediaStream;
  localVideoStream?: MediaStream;
}

@Injectable({
  providedIn: 'root'
})
export class VideoCallService {
  private peerConnection?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private socket?: WebSocket;
  
  private videoCallStateSubject = new BehaviorSubject<VideoCallState>({
    isInCall: false,
    isVideoEnabled: false,
    isAudioEnabled: false,
    isScreenSharing: false,
    connectionState: 'new'
  });

  private currentCallId?: number;
  private currentUserId?: number;
  private currentRole?: string;

  constructor() {
    this.initializeWebSocket();
  }

  // ============== CONFIGURACIÓN INICIAL ==============

  private initializeWebSocket(): void {
    this.socket = new WebSocket('ws://localhost:3001/video');
    
    this.socket.onopen = () => {
      console.log('🎥 Conectado al servidor de videollamadas');
    };

    this.socket.onmessage = (event) => {
      this.handleSignalingMessage(JSON.parse(event.data));
    };

    this.socket.onerror = (error) => {
      console.error('❌ Error en WebSocket de video:', error);
    };

    this.socket.onclose = () => {
      console.log('🔌 Desconectado del servidor de videollamadas');
    };
  }

  private async createPeerConnection(): Promise<void> {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Configurar eventos
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('🎬 Stream remoto recibido');
      this.remoteStream = event.streams[0];
      this.updateVideoState({ remoteVideoStream: this.remoteStream });
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || 'new';
      console.log('🔗 Estado de conexión:', state);
      this.updateVideoState({ connectionState: state });
    };
  }

  // ============== GESTIÓN DE LLAMADAS ==============

  async startCall(consultaId: number, usuarioId: number, rol: string): Promise<void> {
    try {
      console.log('📞 Iniciando videollamada:', { consultaId, usuarioId, rol });
      
      this.currentCallId = consultaId;
      this.currentUserId = usuarioId;
      this.currentRole = rol;

      await this.getLocalStream();
      await this.createPeerConnection();

      // Agregar stream local al peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      this.updateVideoState({ isInCall: true });

      // Notificar al servidor que queremos iniciar una llamada
      this.sendSignalingMessage({
        type: 'start-call',
        consultaId,
        usuarioId,
        rol
      });

    } catch (error) {
      console.error('❌ Error iniciando videollamada:', error);
      throw error;
    }
  }

  async joinCall(consultaId: number, usuarioId: number, rol: string): Promise<void> {
    try {
      console.log('🤝 Uniéndose a videollamada:', { consultaId, usuarioId, rol });
      
      this.currentCallId = consultaId;
      this.currentUserId = usuarioId;
      this.currentRole = rol;

      await this.getLocalStream();
      await this.createPeerConnection();

      // Agregar stream local
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      this.updateVideoState({ isInCall: true });

      // Notificar al servidor que nos unimos
      this.sendSignalingMessage({
        type: 'join-call',
        consultaId,
        usuarioId,
        rol
      });

    } catch (error) {
      console.error('❌ Error uniéndose a videollamada:', error);
      throw error;
    }
  }

  async endCall(): Promise<void> {
    try {
      console.log('📞 Terminando videollamada');

      // Notificar al servidor
      if (this.currentCallId) {
        this.sendSignalingMessage({
          type: 'end-call',
          consultaId: this.currentCallId
        });
      }

      // Limpiar streams
      this.stopLocalStream();
      
      // Cerrar peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = undefined;
      }

      this.remoteStream = undefined;
      this.currentCallId = undefined;
      
      this.updateVideoState({
        isInCall: false,
        isVideoEnabled: false,
        isAudioEnabled: false,
        isScreenSharing: false,
        connectionState: 'closed',
        remoteVideoStream: undefined,
        localVideoStream: undefined
      });

    } catch (error) {
      console.error('❌ Error terminando videollamada:', error);
    }
  }

  // ============== CONTROLES DE MEDIA ==============

  async getLocalStream(video: boolean = true, audio: boolean = true): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audio
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📹 Stream local obtenido');
      
      this.updateVideoState({
        localVideoStream: this.localStream,
        isVideoEnabled: video,
        isAudioEnabled: audio
      });

    } catch (error) {
      console.error('❌ Error obteniendo stream local:', error);
      throw error;
    }
  }

  toggleVideo(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.updateVideoState({ isVideoEnabled: videoTrack.enabled });
        console.log('📹 Video:', videoTrack.enabled ? 'activado' : 'desactivado');
      }
    }
  }

  toggleAudio(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.updateVideoState({ isAudioEnabled: audioTrack.enabled });
        console.log('🎤 Audio:', audioTrack.enabled ? 'activado' : 'desactivado');
      }
    }
  }

  private stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = undefined;
    }
  }

  // ============== SCREEN SHARING ==============

  async shareScreen(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Reemplazar el track de video
      if (this.peerConnection && this.localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s => 
          s.track?.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

        // Actualizar stream local
        const audioTrack = this.localStream.getAudioTracks()[0];
        this.localStream = new MediaStream([videoTrack, audioTrack]);
        
        this.updateVideoState({ 
          isScreenSharing: true,
          localVideoStream: this.localStream
        });

        // Detectar cuando se deje de compartir
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

    } catch (error) {
      console.error('❌ Error compartiendo pantalla:', error);
    }
  }

  async stopScreenShare(): Promise<void> {
    try {
      // Volver a la cámara
      await this.getLocalStream(true, true);
      
      if (this.peerConnection && this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s => 
          s.track?.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      this.updateVideoState({ isScreenSharing: false });

    } catch (error) {
      console.error('❌ Error deteniendo compartir pantalla:', error);
    }
  }

  // ============== SIGNALING ==============

  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      console.log('📡 Mensaje de signaling recibido:', message);

      switch (message.type) {
        case 'call-request':
          // Alguien quiere iniciar una llamada
          this.handleIncomingCall(message);
          break;

        case 'offer':
          await this.handleOffer(message.offer);
          break;

        case 'answer':
          await this.handleAnswer(message.answer);
          break;

        case 'ice-candidate':
          await this.handleIceCandidate(message.candidate);
          break;

        case 'call-ended':
          await this.endCall();
          break;
      }
    } catch (error) {
      console.error('❌ Error manejando mensaje de signaling:', error);
    }
  }

  private async handleIncomingCall(message: any): Promise<void> {
    // Mostrar notificación de llamada entrante
    const accept = confirm(`${message.callerName} te está llamando. ¿Aceptar videollamada?`);
    
    if (accept) {
      await this.joinCall(message.consultaId, this.currentUserId!, this.currentRole!);
      await this.createOffer();
    } else {
      this.sendSignalingMessage({
        type: 'call-rejected',
        consultaId: message.consultaId
      });
    }
  }

  private async createOffer(): Promise<void> {
    if (this.peerConnection) {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignalingMessage({
        type: 'offer',
        offer: offer
      });
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'answer',
        answer: answer
      });
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(answer);
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private sendSignalingMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        ...message,
        consultaId: this.currentCallId,
        usuarioId: this.currentUserId,
        rol: this.currentRole
      }));
    }
  }

  // ============== OBSERVABLES ==============

  getVideoCallState(): Observable<VideoCallState> {
    return this.videoCallStateSubject.asObservable();
  }

  private updateVideoState(updates: Partial<VideoCallState>): void {
    const currentState = this.videoCallStateSubject.value;
    this.videoCallStateSubject.next({ ...currentState, ...updates });
  }

  // ============== UTILIDADES ==============

  isCallActive(): boolean {
    return this.videoCallStateSubject.value.isInCall;
  }

  getRemoteStream(): MediaStream | undefined {
    return this.remoteStream;
  }
}