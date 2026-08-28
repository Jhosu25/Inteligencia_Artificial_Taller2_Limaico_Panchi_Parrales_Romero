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

// Respuestas fijas mientras no hay conexión real al modelo.
const RESPUESTAS_FIJAS = [
  'Entendido, estoy procesando tu solicitud.',
  'Gracias por tu mensaje, esto es una respuesta de prueba.',
  'Interesante, déjame revisarlo con más detalle.',
  'Por ahora solo puedo responder con mensajes predeterminados.',
  'Recibido. Esta es una respuesta simulada mientras se conecta el modelo.',
];

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
   * HOY: devuelve una respuesta fija/aleatoria.
   * DESPUÉS: reemplazar por la llamada real al backend/modelo:
   *   return this.http.post<{ respuesta: string }>('URL_DEL_BACKEND', { mensaje })
   *     .pipe(map(res => res.respuesta));
   */
  getBotResponse(mensaje: string): Observable<string> {
    const respuesta = RESPUESTAS_FIJAS[Math.floor(Math.random() * RESPUESTAS_FIJAS.length)];
    return of(respuesta).pipe(delay(600 + Math.random() * 500));
  }

  /** Solicita al backend el MP3 generado por OpenAI sin exponer la API key. */
  getVoiceResponse(texto: string): Observable<Blob> {
    return this.http.post('/api/voice', { text: texto }, { responseType: 'blob' });
  }

  /**
   * Simula la clasificación de una imagen de ave con el modelo entrenado
   * (EfficientNetB0 + Transfer Learning, dataset Caltech Birds 2011).
   * DESPUÉS: reemplazar por una llamada real que suba la imagen al backend
   * que sirve model.h5, por ejemplo:
   *
   *   const formData = new FormData();
   *   formData.append('imagen', archivo);
   *   return this.http.post<{ especie: string, confianza: number }>(
   *     'URL_DEL_BACKEND/predict', formData
   *   ).pipe(map(res => `Especie detectada: ${res.especie} (${res.confianza}% de confianza)`));
   */
  classifyImage(archivo: File): Observable<string> {
    const especie = ESPECIES_EJEMPLO[Math.floor(Math.random() * ESPECIES_EJEMPLO.length)];
    const confianza = (85 + Math.random() * 12).toFixed(1);
    const respuesta = `Especie detectada: ${especie} — ${confianza}% de confianza.`;
    return of(respuesta).pipe(delay(1000 + Math.random() * 600));
  }
}
