import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

// Respuestas fijas mientras no hay conexión real al modelo.
// Cuando el profesor explique cómo conectar (API, endpoint del modelo .h5, etc.)
// solo hay que reemplazar el cuerpo de getBotResponse().
const RESPUESTAS_FIJAS = [
  'Entendido, estoy procesando tu solicitud.',
  'Gracias por tu mensaje, esto es una respuesta de prueba.',
  'Interesante, déjame revisarlo con más detalle.',
  'Por ahora solo puedo responder con mensajes predeterminados.',
  'Recibido. Esta es una respuesta simulada mientras se conecta el modelo.',
];

@Injectable({
  providedIn: 'root',
})
export class ChatService {

  /**
   * Punto único de conexión con el "cerebro" del chat.
   * HOY: devuelve una respuesta fija/aleatoria (simulando latencia de red).
   * DESPUÉS: reemplazar el contenido de este método por la llamada real
   * al backend/modelo entrenado, por ejemplo:
   *
   *   return this.http.post<{ respuesta: string }>('URL_DEL_BACKEND', { mensaje })
   *     .pipe(map(res => res.respuesta));
   */
  getBotResponse(mensaje: string): Observable<string> {
    const respuesta = RESPUESTAS_FIJAS[Math.floor(Math.random() * RESPUESTAS_FIJAS.length)];
    return of(respuesta).pipe(delay(600 + Math.random() * 500));
  }
}
