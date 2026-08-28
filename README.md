# Chatbot — Taller Práctico 2 (Inteligencia Artificial)

Frontend de chat combinando lo mejor de Claude (mensajes limpios, sin burbujas pesadas), ChatGPT (sidebar con historial, pastilla de input) y Gemini (pantalla de bienvenida con sugerencias de prompt).

## Cómo abrir y correr el proyecto

1. Abre esta carpeta en VS Code.
2. Copia `.env.example` como `.env` y reemplaza el valor de ejemplo con tu clave de OpenAI:
   ```env
   OPENAI_API_KEY=tu_clave_real
   PORT=3000
   ```
   `.env` está ignorado por Git; nunca publiques la clave.
3. En la terminal integrada:
   ```bash
   npm install
   npm start
   ```
4. Abre `http://localhost:4200` en el navegador.

`npm start` levanta Angular y el backend de voz. Angular envía el texto terminado a
`POST /api/voice`; el backend usa `gpt-4o-mini-tts` con la voz `alloy` y devuelve un MP3.
El control **Respuesta por voz** puede detener la reproducción en cualquier momento.
La voz reproducida es generada por inteligencia artificial.

## Estructura relevante

- `src/app/chat/chat.component.ts` — lógica del chat (mensajes, conversaciones, sidebar)
- `src/app/chat/chat.component.html` — plantilla visual
- `src/app/chat/chat.component.css` — estilos (paleta violeta/índigo sobre fondo papel, tipografía Space Grotesk + Inter)
- `src/app/chat/chat.service.ts` — **aquí se conecta el modelo real**
- `server/index.js` — endpoint seguro de voz; la clave de OpenAI nunca llega a Angular
- `proxy.conf.json` — redirige `/api` al backend durante el desarrollo

## Conectar con el modelo entrenado

Por ahora el chat responde con mensajes fijos aleatorios (simulando latencia). Cuando tengan lista la conexión al modelo (API, endpoint, etc.), solo se debe modificar el método `getBotResponse()` en `chat.service.ts`:

```typescript
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

constructor(private http: HttpClient) {}

getBotResponse(mensaje: string): Observable<string> {
  return this.http.post<{ respuesta: string }>('https://TU-BACKEND/predict', { mensaje })
    .pipe(map(res => res.respuesta));
}
```

No olvides agregar `provideHttpClient()` en `src/app/app.config.ts` si usas `HttpClient`.

---

# ChatbotTaller2 (documentación generada por Angular CLI)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
