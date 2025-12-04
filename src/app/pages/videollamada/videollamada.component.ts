import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

declare var JitsiMeetExternalAPI: any;

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
  private jitsiApi: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Cargar el script de Jitsi
    this.loadJitsiScript().then(() => {
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

        // Inicializar Jitsi Meet
        this.inicializarJitsi();
      });
    });
  }

  ngOnDestroy(): void {
    console.log('📞 Saliendo de videollamada');
    if (this.jitsiApi) {
      this.jitsiApi.dispose();
    }
  }

  private loadJitsiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si ya está cargado
      if (typeof JitsiMeetExternalAPI !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi script'));
      document.head.appendChild(script);
    });
  }

  private inicializarJitsi(): void {
    const domain = 'meet.jit.si';
    const options = {
      roomName: this.roomId,
      width: '100%',
      height: '100%',
      parentNode: document.querySelector('#jitsi-container'),
      userInfo: {
        displayName: this.participanteName
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        enableWelcomePage: false
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        DISPLAY_WELCOME_PAGE_CONTENT: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        filmStripOnly: false,
        DEFAULT_REMOTE_DISPLAY_NAME: this.tipo === 'doctor' ? 'Paciente' : 'Doctor'
      }
    };

    this.jitsiApi = new JitsiMeetExternalAPI(domain, options);

    // Event listeners
    this.jitsiApi.addEventListener('videoConferenceJoined', () => {
      console.log('✅ Unido a la videollamada');
    });

    this.jitsiApi.addEventListener('participantJoined', (participant: any) => {
      console.log('👤 Participante se unió:', participant);
    });

    this.jitsiApi.addEventListener('readyToClose', () => {
      this.colgarLlamada();
    });
  }

  colgarLlamada(): void {
    console.log('📴 Colgando llamada');
    if (this.jitsiApi) {
      this.jitsiApi.dispose();
    }
    window.close();
  }
}
