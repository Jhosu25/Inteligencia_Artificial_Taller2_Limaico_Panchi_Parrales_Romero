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
  'Explícame qué es Transfer Learning',
  '¿Cómo funciona la propagación hacia atrás?',
  'Dame ideas para mi proyecto de clasificación de imágenes',
  '¿Qué diferencia hay entre CNN y RNN?',
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

  promptsSugeridos = PROMPTS_SUGERIDOS;

  conversaciones: Conversacion[] = [
    { id: 1, titulo: 'Nueva conversación', mensajes: [] },
  ];
  conversacionActivaId = 1;
  private nextId = 2;

  entradaUsuario: string = '';
  escribiendo: boolean = false;
  sidebarAbierta: boolean = true;

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
  }

  seleccionarConversacion(id: number): void {
    this.conversacionActivaId = id;
  }

  usarPrompt(prompt: string): void {
    this.entradaUsuario = prompt;
    this.enviarMensaje();
  }

  enviarMensaje(): void {
    const texto = this.entradaUsuario.trim();
    if (!texto || this.escribiendo) return;

    const conv = this.conversacionActiva;
    conv.mensajes.push({ role: 'user', text: texto, timestamp: new Date() });

    if (conv.mensajes.length === 1) {
      conv.titulo = texto.length > 32 ? texto.slice(0, 32) + '…' : texto;
    }

    this.entradaUsuario = '';
    this.escribiendo = true;
    this.autoResize();

    this.chatService.getBotResponse(texto).subscribe((respuesta) => {
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
