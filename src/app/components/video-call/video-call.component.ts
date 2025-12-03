import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { VideoCallService, VideoCallState } from '../../services/video-call.service';
import { ChatService } from '../../services/chat.service';

interface IncomingCall {
  consultaId: number;
  callerName: string;
  role: string;
}

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.css']
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('chatMessagesContainer') chatMessagesRef?: ElementRef;

  @Input() consultaId?: number;
  @Input() participantName: string = '';
  @Input() currentUserRole: string = '';
  @Input() currentUserId?: number;
  @Input() canStartVideoCall: boolean = false;

  @Output() callEnded = new EventEmitter<void>();
  @Output() callStarted = new EventEmitter<void>();

  // Estados de la videollamada
  isCallActive: boolean = false;
  isVideoEnabled: boolean = true;
  isAudioEnabled: boolean = true;
  isScreenSharing: boolean = false;
  connectionState: string = 'new';

  // Streams
  localStream?: MediaStream;
  remoteStream?: MediaStream;

  // Chat
  showChat: boolean = false;
  chatMessages: any[] = [];
  newMessage: string = '';
  unreadMessages: number = 0;

  // Llamada entrante
  incomingCall?: IncomingCall;

  // Timing
  callStartTime?: Date;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private videoCallService: VideoCallService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.initializeVideoCall();
    this.initializeChat();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.videoCallService.endCall();
  }

  // ============== INICIALIZACIÓN ==============

  private initializeVideoCall(): void {
    // Suscribirse al estado de la videollamada
    const videoStateSubscription = this.videoCallService.getVideoCallState().subscribe(
      (state: VideoCallState) => {
        this.updateVideoState(state);
      }
    );
    this.subscriptions.push(videoStateSubscription);
  }

  private initializeChat(): void {
    // Suscribirse a los mensajes del chat
    const chatSubscription = this.chatService.getMensajes().subscribe(
      (mensajes: any[]) => {
        this.chatMessages = mensajes;
        this.scrollToBottom();

        // Contar mensajes no leídos si el chat está cerrado
        if (!this.showChat) {
          this.unreadMessages++;
        }
      }
    );
    this.subscriptions.push(chatSubscription);
  }

  private updateVideoState(state: VideoCallState): void {
    this.isCallActive = state.isInCall;
    this.isVideoEnabled = state.isVideoEnabled;
    this.isAudioEnabled = state.isAudioEnabled;
    this.isScreenSharing = state.isScreenSharing;
    this.connectionState = state.connectionState;

    // Actualizar streams de video
    if (state.localVideoStream !== this.localStream) {
      this.localStream = state.localVideoStream;
      this.updateLocalVideo();
    }

    if (state.remoteVideoStream !== this.remoteStream) {
      this.remoteStream = state.remoteVideoStream;
      this.updateRemoteVideo();
    }

    // Si la llamada acaba de empezar
    if (state.isInCall && !this.callStartTime) {
      this.callStartTime = new Date();
      this.callStarted.emit();
    }
  }

  private updateLocalVideo(): void {
    if (this.localVideo && this.localStream) {
      this.localVideo.nativeElement.srcObject = this.localStream;
    }
  }

  private updateRemoteVideo(): void {
    if (this.remoteVideo && this.remoteStream) {
      this.remoteVideo.nativeElement.srcObject = this.remoteStream;
    }
  }

  // ============== CONTROLES DE LLAMADA ==============

  async startVideoCall(): Promise<void> {
    if (!this.consultaId || !this.currentUserId) {
      console.error('❌ Faltan datos para iniciar videollamada');
      return;
    }

    try {
      await this.videoCallService.startCall(
        this.consultaId,
        this.currentUserId,
        this.currentUserRole
      );
    } catch (error) {
      console.error('❌ Error iniciando videollamada:', error);
      alert('Error iniciando la videollamada. Revisa los permisos de cámara y micrófono.');
    }
  }

  async acceptCall(): Promise<void> {
    if (!this.incomingCall || !this.currentUserId) return;

    try {
      await this.videoCallService.joinCall(
        this.incomingCall.consultaId,
        this.currentUserId,
        this.currentUserRole
      );
      this.incomingCall = undefined;
    } catch (error) {
      console.error('❌ Error aceptando videollamada:', error);
      alert('Error aceptando la videollamada. Revisa los permisos de cámara y micrófono.');
    }
  }

  declineCall(): void {
    // TODO: Enviar rechazo de llamada
    this.incomingCall = undefined;
  }

  async endCall(): Promise<void> {
    await this.videoCallService.endCall();
    this.callStartTime = undefined;
    this.callEnded.emit();
  }

  // ============== CONTROLES DE MEDIA ==============

  toggleVideo(): void {
    this.videoCallService.toggleVideo();
  }

  toggleAudio(): void {
    this.videoCallService.toggleAudio();
  }

  async toggleScreenShare(): Promise<void> {
    if (this.isScreenSharing) {
      await this.videoCallService.stopScreenShare();
    } else {
      await this.videoCallService.shareScreen();
    }
  }

  // ============== CHAT ==============

  toggleChat(): void {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.unreadMessages = 0;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendChatMessage(): void {
    if (!this.newMessage.trim()) return;

    // Usar el servicio de chat para enviar mensajes
    // Usamos currentUserRole si está disponible
    const senderName = this.currentUserRole === 'patient' ? 'Paciente' : 'Doctor';
    this.chatService.enviarMensaje(this.newMessage.trim(), senderName);
    this.newMessage = '';

    setTimeout(() => this.scrollToBottom(), 100);
  }

  private scrollToBottom(): void {
    if (this.chatMessagesRef) {
      const element = this.chatMessagesRef.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  // ============== UI HELPERS ==============

  getConnectionStatusText(): string {
    switch (this.connectionState) {
      case 'connecting': return 'Conectando...';
      case 'connected': return 'Conectado';
      case 'disconnected': return 'Desconectado';
      case 'failed': return 'Error de conexión';
      case 'closed': return 'Desconectado';
      default: return 'Iniciando...';
    }
  }

  formatCallDuration(startTime?: Date): string {
    if (!startTime) return '00:00';

    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatTime(timestamp: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  }

  openSettings(): void {
    // TODO: Abrir modal de configuraciones
    console.log('🔧 Abriendo configuraciones de videollamada');
  }
}
