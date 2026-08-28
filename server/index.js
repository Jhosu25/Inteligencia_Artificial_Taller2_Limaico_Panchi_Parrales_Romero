const path = require("node:path");
const express = require("express");
const OpenAI = require("openai");
require("dotenv").config();

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const port = Number(process.env.PORT) || 3000;
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.post("/api/voice", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

  if (!text) {
    return res.status(400).json({ error: "El texto es obligatorio." });
  }

  if (text.length > 8000) {
    return res
      .status(400)
      .json({ error: "El texto es demasiado largo para generar voz." });
  }

  if (!openai) {
    return res
      .status(503)
      .json({ error: "El servicio de voz no está configurado." });
  }

  try {
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      instructions: "Habla en español de forma clara y natural",
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(audioBuffer);
  } catch (error) {
    console.error(
      "No se pudo generar la voz con OpenAI:",
      error?.message || error,
    );
    return res
      .status(502)
      .json({ error: "No se pudo generar la respuesta por voz." });
  }
});

const SYSTEM_PROMPT = `
Eres AVIS, un asistente virtual especializado en el mundo de las aves,
que funciona como una enciclopedia interactiva y guía de cuidado.

Tu conocimiento cubre tres áreas:

1. IDENTIFICACIÓN Y ENCICLOPEDIA
   - Trabajas junto a un modelo de clasificación de imágenes (EfficientNetB0)
     entrenado con el dataset Caltech Birds 2011 (CUB-200-2011), que reconoce
     200 especies distintas de aves.
   - Cuando el usuario active el "Modo Visión Artificial", las imágenes que
     envíe NO llegan a ti — se procesan con el modelo de clasificación y se
     muestra la especie detectada.
   - Puedes explicar hábitat, alimentación, comportamiento, migración y
     curiosidades de cualquier especie de ave.

2. CUIDADO DE AVES COMO MASCOTAS
   - Orientas sobre condiciones básicas de vivienda (tamaño de jaula, temperatura,
     iluminación), alimentación adecuada en cautiverio, enriquecimiento ambiental
     y socialización.
   - Puedes señalar signos generales de alerta en la salud de un ave (cambios de
     comportamiento, plumaje, apetito), pero SIEMPRE aclaras que no reemplazas
     una consulta veterinaria y recomiendas acudir a un especialista ante
     cualquier síntoma preocupante.

3. REFUGIOS Y CENTROS ESPECIALIZADOS
   - Explicas en términos generales qué hace un refugio o centro de rescate de
     aves, cuándo es apropiado contactar a uno (aves silvestres heridas,
     especies protegidas, abandono), y buenas prácticas de manejo responsable.
   - No inventes nombres, direcciones ni teléfonos reales de refugios
     específicos; mantente en recomendaciones generales.

# Formato de salida

Cuando el usuario pregunte específicamente por el cuidado o las
características de una especie de ave, estructura tu respuesta así:

- **Especie o tema:** nombre del ave o tema tratado.
- **Datos clave:** hábitat, alimentación o comportamiento relevante.
- **Cuidados recomendados:** consejos prácticos si aplica (solo si es
  relevante, por ejemplo si se habla de un ave como mascota).
- **Cuándo consultar a un especialista:** indica si el caso amerita acudir
  a un veterinario o refugio.

Para saludos, preguntas generales o conversación casual, responde de forma
natural y breve, sin forzar este formato.

# Notas

- Si te preguntan algo totalmente ajeno al mundo de las aves, redirige
  amablemente la conversación hacia tu especialidad.
- Sé conciso, cálido y educativo en tus respuestas.
`.trim();

app.post("/api/chat", async (req, res) => {
  const { mensaje, historial } = req.body || {};

  if (!mensaje || typeof mensaje !== "string") {
    return res.status(400).json({ error: "El mensaje es obligatorio." });
  }

  if (!openai) {
    return res.status(503).json({ error: "El servicio de chat no está configurado." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(Array.isArray(historial) ? historial : []),
        { role: "user", content: mensaje },
      ],
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("No se pudo generar la respuesta con OpenAI:", error?.message || error);
    res.write(`data: ${JSON.stringify({ error: "No se pudo generar la respuesta." })}\n\n`);
    res.end();
  }
});

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió ningún archivo de audio." });
  }

  if (!openai) {
    return res.status(503).json({ error: "El servicio de transcripción no está configurado." });
  }

  try {
    const { toFile } = require("openai/uploads");
    const archivo = await toFile(req.file.buffer, "audio.webm", { type: req.file.mimetype });

    const transcripcion = await openai.audio.transcriptions.create({
      file: archivo,
      model: "whisper-1",
      language: "es",
    });

    res.json({ text: transcripcion.text });
  } catch (error) {
    console.error("No se pudo transcribir el audio:", error?.message || error);
    res.status(502).json({ error: "No se pudo transcribir el audio." });
  }
});

const angularDist = path.join(
  __dirname,
  "..",
  "dist",
  "chatbot-taller2",
  "browser",
);
app.use(express.static(angularDist));

app.listen(port, () => {
  console.log(`Servidor de voz disponible en http://localhost:${port}`);
});
