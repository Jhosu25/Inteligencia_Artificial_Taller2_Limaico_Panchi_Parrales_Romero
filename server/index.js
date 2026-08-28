const path = require("node:path");
const express = require("express");
const OpenAI = require("openai");
require("dotenv").config();

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
