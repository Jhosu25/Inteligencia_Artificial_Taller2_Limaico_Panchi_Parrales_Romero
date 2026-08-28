import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';

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

// Respuestas fijas mientras no hay conexión real al modelo.
const RESPUESTAS_FIJAS = [
  'Entendido, estoy procesando tu solicitud.',
  'Gracias por tu mensaje, esto es una respuesta de prueba.',
  'Interesante, déjame revisarlo con más detalle.',
  'Por ahora solo puedo responder con mensajes predeterminados.',
  'Recibido. Esta es una respuesta simulada mientras se conecta el modelo.',
];

// Backend Flask que sirve el modelo entrenado (EfficientNetB0 + Transfer Learning
// sobre Caltech Birds 2011). Ver app.py en la raíz del proyecto.
const IMAGE_API_URL = 'http://localhost:8000';

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
