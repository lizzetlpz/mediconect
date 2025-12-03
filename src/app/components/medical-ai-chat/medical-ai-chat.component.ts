import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MedicalAIService, MensajeIA } from '../../services/medical-ai.service';
import { Nl2BrPipe } from '../../pipes/nl2br.pipe';

@Component({
  selector: 'app-medical-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, Nl2BrPipe],
  templateUrl: './medical-ai-chat.component.html',
  styleUrls: ['./medical-ai-chat.component.css']
})
export class MedicalAIChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessages') private chatMessagesRef?: ElementRef;

  mensajes: MensajeIA[] = [];
  nuevaRespuesta: string = '';
  conversacionActiva: boolean = false;
  escribiendo: boolean = false;

  private subscriptions: Subscription[] = [];
  private shouldScrollToBottom = false;

  constructor(private medicalAIService: MedicalAIService) {}

  ngOnInit(): void {
    // Suscribirse a los mensajes
    this.subscriptions.push(
      this.medicalAIService.mensajes$.subscribe(mensajes => {
        this.mensajes = mensajes;
        this.shouldScrollToBottom = true;
      })
    );

    // Suscribirse al estado de la conversación
    this.subscriptions.push(
      this.medicalAIService.conversacionActiva$.subscribe(activa => {
        this.conversacionActiva = activa;
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Iniciar conversación
  iniciarConversacion(): void {
    this.medicalAIService.iniciarConversacion();
  }

  // Enviar respuesta
  enviarRespuesta(): void {
    if (!this.nuevaRespuesta.trim()) return;

    this.escribiendo = true;
    this.medicalAIService.enviarRespuesta(this.nuevaRespuesta);
    this.nuevaRespuesta = '';

    // Simular que la IA está "escribiendo"
    setTimeout(() => {
      this.escribiendo = false;
    }, 2000);
  }

  // Manejar Enter en textarea
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarRespuesta();
    }
  }

  // Finalizar conversación
  finalizarConversacion(): void {
    this.medicalAIService.finalizarConversacion();
  }

  // Obtener iniciales para avatar
  getIniciales(remitente: string): string {
    if (remitente === 'ia') return 'IA';
    return 'TU';
  }

  // Formatear tiempo del mensaje
  formatearTiempo(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Scroll al final
  private scrollToBottom(): void {
    if (this.chatMessagesRef) {
      const element = this.chatMessagesRef.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  // Verificar si es mensaje de diagnóstico
  esDiagnostico(mensaje: MensajeIA): boolean {
    return mensaje.tipo === 'diagnostico';
  }
}
