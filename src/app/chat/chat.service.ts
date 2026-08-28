import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  imageDataUrl?: string;
}

interface PrediccionEspecie {
  especie: string;
  confianza: number;
}

// Backend Flask que sirve el modelo entrenado (EfficientNetB0 + Transfer Learning
// sobre Caltech Birds 2011). Ver app.py en la raíz del proyecto.
const IMAGE_API_URL = 'http://localhost:8000';

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
   * Clasifica una imagen de ave con el modelo entrenado (EfficientNetB0 + Transfer
   * Learning, dataset Caltech Birds 2011) sirviéndose del backend Flask (app.py).
   */
  classifyImage(archivo: File): Observable<string> {
    const formData = new FormData();
    formData.append('imagen', archivo);

    return this.http.post<PrediccionEspecie>(`${IMAGE_API_URL}/predict`, formData).pipe(
      map(
        (res) =>
          `Especie detectada: ${res.especie.replace(/_/g, ' ')} — ${res.confianza}% de confianza.`
      ),
      catchError(() =>
        of(
          'No pude clasificar la imagen. Verifica que el backend de clasificación (Flask, puerto 8000) esté corriendo.'
        )
      )
    );
  }
}