import { Component, ElementRef, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from './chat.service';

interface Conversacion {
  id: number;
  titulo: string;
  mensajes: ChatMessage[];
}

const PROMPTS_SUGERIDOS = [
  'Sube una foto de un ave y te diré su especie',
  '¿Qué precisión tiene el modelo entrenado?',
  '¿Qué es el dataset Caltech Birds 2011?',
  '¿Cómo funciona EfficientNetB0?',
];

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('inputArea') private inputArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  promptsSugeridos = PROMPTS_SUGERIDOS;

  conversaciones: Conversacion[] = [
    { id: 1, titulo: 'Nueva conversación', mensajes: [] },
  ];
  conversacionActivaId = 1;
  private nextId = 2;

  entradaUsuario: string = '';
  escribiendo: boolean = false;
  sidebarAbierta: boolean = true;
  respuestaPorVozActiva: boolean = false;
  generandoVoz: boolean = false;
  errorVoz: string | null = null;

  clasificacionImagenActiva: boolean = false;

  grabandoAudio: boolean = false;
  transcribiendoAudio: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  private audioActual: HTMLAudioElement | null = null;
  private audioUrlActual: string | null = null;
  private solicitudVoz: Subscription | null = null;

  imagenSeleccionada: File | null = null;
  imagenPreviewUrl: string | null = null;

  constructor(private chatService: ChatService) {}

  get conversacionActiva(): Conversacion {
    return this.conversaciones.find(c => c.id === this.conversacionActivaId)!;
  }

  get mensajes(): ChatMessage[] {
    return this.conversacionActiva.mensajes;
  }

  nuevaConversacion(): void {
    const nueva: Conversacion = { id: this.nextId, titulo: 'Nueva conversación', mensajes: [] };
    this.conversaciones.unshift(nueva);
    this.conversacionActivaId = nueva.id;
    this.nextId++;
    this.entradaUsuario = '';
    this.quitarImagen();
  }

  seleccionarConversacion(id: number): void {
    this.conversacionActivaId = id;
  }

  usarPrompt(prompt: string): void {
    this.entradaUsuario = prompt;
    this.enviarMensaje();
  }

  abrirSelectorArchivo(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.imagenSeleccionada = archivo;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagenPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.imagenSeleccionada = null;
    this.imagenPreviewUrl = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  async alternarGrabacion(): Promise<void> {
    if (this.grabandoAudio) {
      this.mediaRecorder?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.enviarAudioParaTranscribir(audioBlob);
      };

      this.mediaRecorder.start();
            this.grabandoAudio = true;

      // Corta automáticamente la grabación a los 15 segundos
      setTimeout(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, 15000);
    } catch (e) {
      console.error('No se pudo acceder al micrófono:', e);
    }
  }

  private enviarAudioParaTranscribir(audioBlob: Blob): void {
    this.grabandoAudio = false;
    this.transcribiendoAudio = true;

    this.chatService.transcribeAudio(audioBlob).subscribe({
      next: (resultado) => {
        this.transcribiendoAudio = false;
        this.entradaUsuario = resultado.text;
        this.enviarMensaje();
      },
      error: () => {
        this.transcribiendoAudio = false;
        console.error('No se pudo transcribir el audio.');
      },
    });
  }

  async enviarMensaje(): Promise<void> {
    const texto = this.entradaUsuario.trim();
    if (!texto && !this.imagenSeleccionada) return;
    if (this.escribiendo) return;
    if (this.imagenSeleccionada && !this.clasificacionImagenActiva) return;

    const conv = this.conversacionActiva;

    conv.mensajes.push({
      role: 'user',
      text: texto,
      timestamp: new Date(),
      imageDataUrl: this.imagenPreviewUrl || undefined,
    });

    if (conv.mensajes.length === 1) {
      const base = texto || 'Imagen enviada';
      conv.titulo = base.length > 32 ? base.slice(0, 32) + '…' : base;
    }

    this.escribiendo = true;
    const archivoParaClasificar = this.imagenSeleccionada;

    this.entradaUsuario = '';
    this.quitarImagen();
    this.autoResize();

    if (archivoParaClasificar) {
      this.chatService.classifyImage(archivoParaClasificar).subscribe({
        next: (respuesta) => {
          conv.mensajes.push({ role: 'bot', text: respuesta, timestamp: new Date() });
          this.escribiendo = false;

          if (this.respuestaPorVozActiva) {
            this.generarYReproducirVoz(respuesta);
          }
        },
        error: () => {
          conv.mensajes.push({
            role: 'bot',
            text: 'No pude procesar la imagen. Inténtalo nuevamente.',
            timestamp: new Date(),
          });
          this.escribiendo = false;
        },
      });
      return;
    }

    const historial = conv.mensajes
      .slice(0, -1)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

    const mensajeBot: ChatMessage = { role: 'bot', text: '', timestamp: new Date() };
    conv.mensajes.push(mensajeBot);

    try {
      await this.chatService.streamBotResponse(texto, historial, (token) => {
        mensajeBot.text += token;
      });
    } catch (e) {
      mensajeBot.text = 'No pude conectarme con el asistente. Inténtalo nuevamente.';
    }

    this.escribiendo = false;

    if (this.respuestaPorVozActiva && mensajeBot.text) {
      this.generarYReproducirVoz(mensajeBot.text);
    }
  }

  alCambiarRespuestaPorVoz(activada: boolean): void {
    this.respuestaPorVozActiva = activada;
    this.errorVoz = null;

    if (!activada) {
      this.detenerAudio();
    }
  }

  alCambiarClasificacionImagen(activada: boolean): void {
    this.clasificacionImagenActiva = activada;

    if (!activada) {
      this.quitarImagen();
    }
  }

  private generarYReproducirVoz(texto: string): void {
    this.detenerAudio();
    this.generandoVoz = true;
    this.errorVoz = null;

    this.solicitudVoz = this.chatService.getVoiceResponse(texto).subscribe({
      next: (audioBlob) => {
        if (!this.respuestaPorVozActiva) return;

        this.audioUrlActual = URL.createObjectURL(audioBlob);
        this.audioActual = new Audio(this.audioUrlActual);
        this.audioActual.addEventListener('ended', () => this.liberarAudio(), { once: true });
        this.audioActual.addEventListener('error', () => {
          this.errorVoz = 'No se pudo reproducir la respuesta por voz.';
          this.liberarAudio();
        }, { once: true });
        this.audioActual.play().catch(() => {
          this.errorVoz = 'El navegador bloqueó la reproducción automática del audio.';
          this.liberarAudio();
        });
      },
      error: () => {
        this.generandoVoz = false;
        this.errorVoz = 'No se pudo generar la voz. La respuesta escrita sigue disponible.';
      },
      complete: () => {
        this.generandoVoz = false;
        this.solicitudVoz = null;
      },
    });
  }

  private detenerAudio(): void {
    this.solicitudVoz?.unsubscribe();
    this.solicitudVoz = null;
    this.generandoVoz = false;

    if (this.audioActual) {
      this.audioActual.pause();
      this.audioActual.currentTime = 0;
    }

    this.liberarAudio();
  }

  private liberarAudio(): void {
    this.audioActual = null;
    if (this.audioUrlActual) {
      URL.revokeObjectURL(this.audioUrlActual);
      this.audioUrlActual = null;
    }
  }

  manejarEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  autoResize(): void {
    setTimeout(() => {
      const el = this.inputArea?.nativeElement;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    });
  }

  toggleSidebar(): void {
    this.sidebarAbierta = !this.sidebarAbierta;
  }

  ngAfterViewChecked(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch (e) {}
  }

  ngOnDestroy(): void {
    this.detenerAudio();
  }
}