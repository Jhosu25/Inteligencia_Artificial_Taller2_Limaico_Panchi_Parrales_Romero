import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
export class ChatComponent implements AfterViewChecked {
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

  enviarMensaje(): void {
    const texto = this.entradaUsuario.trim();
    if (!texto && !this.imagenSeleccionada) return;
    if (this.escribiendo) return;

    const conv = this.conversacionActiva;

    conv.mensajes.push({
      role: 'user',
      text: texto || '(imagen enviada)',
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

    const respuesta$ = archivoParaClasificar
      ? this.chatService.classifyImage(archivoParaClasificar)
      : this.chatService.getBotResponse(texto);

    respuesta$.subscribe((respuesta) => {
      conv.mensajes.push({ role: 'bot', text: respuesta, timestamp: new Date() });
      this.escribiendo = false;
    });
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
}