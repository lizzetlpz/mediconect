import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MensajeIA {
  id: string;
  texto: string;
  remitente: 'ia' | 'paciente';
  timestamp: Date;
  tipo?: 'pregunta' | 'respuesta' | 'diagnostico';
}

export interface SintomasData {
  sintomas: string[];
  duracion: string;
  intensidad: number;
  ubicacion?: string;
  factoresAgravantes?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MedicalAIService {
  private conversacionActiva = new BehaviorSubject<boolean>(false);
  private mensajes = new BehaviorSubject<MensajeIA[]>([]);
  private pasoActual = 0;
  private sintomasRecolectados: SintomasData = {
    sintomas: [],
    duracion: '',
    intensidad: 0
  };

  // Preguntas secuenciales de la IA
  private preguntasIA = [
    "¡Hola! Soy tu asistente médico virtual. ¿Cuáles son los síntomas principales que estás experimentando?",
    "¿Desde cuándo tienes estos síntomas? (por ejemplo: desde ayer, hace 3 días, una semana)",
    "En una escala del 1 al 10, ¿qué tan intensos son tus síntomas? (1 = muy leve, 10 = muy intenso)",
    "¿En qué parte de tu cuerpo sientes principalmente estos síntomas?",
    "¿Hay algo que empeore o mejore tus síntomas? (ejercicio, comida, descanso, etc.)"
  ];

  // Base de conocimiento médico simplificada
  private baseDiagnosticos = {
    'dolor de cabeza': {
      leve: 'Posible cefalea tensional. Recomendación: descanso, hidratación y analgésico suave.',
      moderado: 'Posible migraña. Recomendación: ambiente oscuro, descanso y consulta médica si persiste.',
      severo: 'Cefalea severa. Recomendación: consulta médica inmediata.'
    },
    'fiebre': {
      leve: 'Fiebre leve, posible infección viral. Recomendación: reposo, hidratación y paracetamol.',
      moderado: 'Fiebre moderada. Recomendación: consulta médica para evaluación.',
      severo: 'Fiebre alta. Recomendación: consulta médica urgente.'
    },
    'tos': {
      leve: 'Tos leve, posible irritación. Recomendación: hidratación y miel.',
      moderado: 'Tos persistente. Recomendación: consulta médica para evaluación.',
      severo: 'Tos severa. Recomendación: consulta médica urgente.'
    },
    'dolor abdominal': {
      leve: 'Molestia digestiva leve. Recomendación: dieta blanda y observación.',
      moderado: 'Dolor abdominal moderado. Recomendación: consulta médica.',
      severo: 'Dolor abdominal severo. Recomendación: consulta médica urgente.'
    }
  };

  constructor() {}

  // Observables públicos
  get conversacionActiva$(): Observable<boolean> {
    return this.conversacionActiva.asObservable();
  }

  get mensajes$(): Observable<MensajeIA[]> {
    return this.mensajes.asObservable();
  }

  // Iniciar conversación con IA
  iniciarConversacion(): void {
    console.log('🤖 Iniciando conversación con IA médica');
    this.pasoActual = 0;
    this.sintomasRecolectados = {
      sintomas: [],
      duracion: '',
      intensidad: 0
    };

    const mensajes: MensajeIA[] = [{
      id: this.generarId(),
      texto: this.preguntasIA[0],
      remitente: 'ia',
      timestamp: new Date(),
      tipo: 'pregunta'
    }];

    this.mensajes.next(mensajes);
    this.conversacionActiva.next(true);
  }

  // Enviar respuesta del paciente
  enviarRespuesta(respuesta: string): void {
    if (!respuesta.trim()) return;

    const mensajesActuales = this.mensajes.value;

    // Agregar respuesta del paciente
    const mensajePaciente: MensajeIA = {
      id: this.generarId(),
      texto: respuesta.trim(),
      remitente: 'paciente',
      timestamp: new Date(),
      tipo: 'respuesta'
    };

    mensajesActuales.push(mensajePaciente);

    // Procesar respuesta según el paso actual
    this.procesarRespuesta(respuesta.trim());

    this.pasoActual++;

    // Generar siguiente pregunta o diagnóstico
    if (this.pasoActual < this.preguntasIA.length) {
      setTimeout(() => {
        const siguientePregunta: MensajeIA = {
          id: this.generarId(),
          texto: this.preguntasIA[this.pasoActual],
          remitente: 'ia',
          timestamp: new Date(),
          tipo: 'pregunta'
        };

        const mensajesActualizados = this.mensajes.value;
        mensajesActualizados.push(siguientePregunta);
        this.mensajes.next([...mensajesActualizados]);
      }, 1000);
    } else {
      // Generar diagnóstico final
      setTimeout(() => {
        this.generarDiagnostico();
      }, 1500);
    }

    this.mensajes.next([...mensajesActuales]);
  }

  // Procesar respuesta según el paso
  private procesarRespuesta(respuesta: string): void {
    switch (this.pasoActual) {
      case 0: // Síntomas principales
        this.sintomasRecolectados.sintomas = this.extraerSintomas(respuesta);
        break;
      case 1: // Duración
        this.sintomasRecolectados.duracion = respuesta;
        break;
      case 2: // Intensidad
        this.sintomasRecolectados.intensidad = this.extraerIntensidad(respuesta);
        break;
      case 3: // Ubicación
        this.sintomasRecolectados.ubicacion = respuesta;
        break;
      case 4: // Factores agravantes
        this.sintomasRecolectados.factoresAgravantes = [respuesta];
        break;
    }
  }

  // Extraer síntomas del texto
  private extraerSintomas(texto: string): string[] {
    const sintomasComunes = [
      'dolor de cabeza', 'fiebre', 'tos', 'dolor abdominal', 'náuseas',
      'vómitos', 'diarrea', 'dolor de garganta', 'congestión nasal',
      'dolor muscular', 'fatiga', 'mareos'
    ];

    const textoLower = texto.toLowerCase();
    return sintomasComunes.filter(sintoma => textoLower.includes(sintoma));
  }

  // Extraer intensidad numérica
  private extraerIntensidad(texto: string): number {
    const match = texto.match(/\b([1-9]|10)\b/);
    return match ? parseInt(match[1]) : 5; // Default 5 si no se encuentra número
  }

  // Generar diagnóstico basado en síntomas
  private generarDiagnostico(): void {
    let diagnostico = "Basado en tus síntomas, aquí está mi evaluación:\n\n";

    if (this.sintomasRecolectados.sintomas.length === 0) {
      diagnostico += "⚠️ No pude identificar síntomas específicos. Te recomiendo que consultes con un médico para una evaluación adecuada.\n\n";
    } else {
      // Analizar cada síntoma
      for (const sintoma of this.sintomasRecolectados.sintomas) {
        if (this.baseDiagnosticos[sintoma as keyof typeof this.baseDiagnosticos]) {
          const intensidad = this.sintomasRecolectados.intensidad;
          let nivel: 'leve' | 'moderado' | 'severo';

          if (intensidad <= 3) nivel = 'leve';
          else if (intensidad <= 7) nivel = 'moderado';
          else nivel = 'severo';

          const recomendacion = this.baseDiagnosticos[sintoma as keyof typeof this.baseDiagnosticos][nivel];
          diagnostico += `🔸 **${sintoma.toUpperCase()}**: ${recomendacion}\n\n`;
        }
      }
    }

    diagnostico += "⚠️ **IMPORTANTE**: Este es solo un análisis preliminar. Para un diagnóstico profesional y tratamiento adecuado, te recomiendo agendar una cita con uno de nuestros médicos.\n\n";
    diagnostico += "¿Te gustaría agendar una consulta médica ahora?";

    const mensajeDiagnostico: MensajeIA = {
      id: this.generarId(),
      texto: diagnostico,
      remitente: 'ia',
      timestamp: new Date(),
      tipo: 'diagnostico'
    };

    const mensajesActuales = this.mensajes.value;
    mensajesActuales.push(mensajeDiagnostico);
    this.mensajes.next([...mensajesActuales]);
  }

  // Finalizar conversación
  finalizarConversacion(): void {
    this.conversacionActiva.next(false);
    this.pasoActual = 0;
  }

  // Obtener síntomas recolectados
  obtenerSintomasRecolectados(): SintomasData {
    return { ...this.sintomasRecolectados };
  }

  // Utilidad para generar IDs
  private generarId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
