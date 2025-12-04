import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-videollamada',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videollamada.component.html',
  styleUrls: ['./videollamada.component.css']
})
export class VideollamadaComponent implements OnInit, OnDestroy {
  roomId: string = '';
  consultaId: string = '';
  citaId: string = '';
  tipo: string = '';
  participanteName: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.roomId = params['room'] || '';
      this.consultaId = params['consultaId'] || '';
      this.citaId = params['citaId'] || '';
      this.tipo = params['tipo'] || '';
      
      this.participanteName = this.tipo === 'doctor' ? 'Doctor' : 'Paciente';
      
      console.log('📞 Videollamada iniciada:', {
        roomId: this.roomId,
        consultaId: this.consultaId,
        citaId: this.citaId,
        tipo: this.tipo
      });

      // Inicializar videollamada
      this.inicializarVideollamada();
    });
  }

  ngOnDestroy(): void {
    console.log('📞 Saliendo de videollamada');
  }

  private inicializarVideollamada(): void {
    console.log('🎥 Inicializando videollamada con sala:', this.roomId);
    
    // Aquí se integraría con WebRTC, Jitsi, Daily.co, etc.
    // Por ahora, mostramos un mensaje informativo
  }

  colgarLlamada(): void {
    console.log('📴 Colgando llamada');
    window.close();
  }
}
