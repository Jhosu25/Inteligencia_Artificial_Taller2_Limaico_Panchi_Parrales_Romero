import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  imageDataUrl?: string;
}

// Especies de ejemplo del dataset Caltech Birds 2011 (CUB-200-2011)
const ESPECIES_EJEMPLO = [
  'Cardenal Rojo (Northern Cardinal)',
  'Colibrí Garganta Rubí (Ruby throated Hummingbird)',
  'Arrendajo Azul (Blue Jay)',
  'Golondrina Común (Barn Swallow)',
  'Pinzón Dorado Americano (American Goldfinch)',
  'Petirrojo Americano (American Robin)',
];

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(private http: HttpClient) {}

  /**
   * Conexión real con el backend que llama a OpenAI con streaming.
   * onToken se ejecuta cada vez que llega un pedazo nuevo de texto.
   */
  async streamBotResponse(
    mensaje: string,
    historial: { role: string; content: string }[],
    onToken: (token: string) => void
  ): Promise<void> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje, historial }),
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lineas = buffer.split('\n\n');
      buffer = lineas.pop() || '';

      for (const linea of lineas) {
        if (!linea.startsWith('data: ')) continue;
        const data = linea.replace('data: ', '').trim();
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.token) onToken(parsed.token);
        } catch (e) {}
      }
    }
  }


  /** Solicita al backend el MP3 generado por OpenAI sin exponer la API key. */
  getVoiceResponse(texto: string): Observable<Blob> {
    return this.http.post('/api/voice', { text: texto }, { responseType: 'blob' });
  }

  /** Envía el audio grabado al backend para transcribirlo con Whisper. */
  transcribeAudio(audioBlob: Blob): Observable<{ text: string }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    return this.http.post<{ text: string }>('/api/transcribe', formData);
  }

  /**
   * Simula la clasificación de una imagen de ave con el modelo entrenado
   * (EfficientNetB0 + Transfer Learning, dataset Caltech Birds 2011).
   * DESPUÉS: reemplazar por una llamada real que suba la imagen al backend
   * que sirve model.h5.
   */
  classifyImage(archivo: File): Observable<string> {
    const especie = ESPECIES_EJEMPLO[Math.floor(Math.random() * ESPECIES_EJEMPLO.length)];
    const confianza = (85 + Math.random() * 12).toFixed(1);
    const respuesta = `Especie detectada: ${especie} — ${confianza}% de confianza.`;
    return of(respuesta).pipe(delay(1000 + Math.random() * 600));
  }
}