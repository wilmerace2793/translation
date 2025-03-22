const express = require("express");
const { spawn } = require("child_process");
const { PassThrough } = require("stream");

const app = express();
const PORT = 8080;
const audioDevice = "Mezcla estéreo (Realtek High Definition Audio)";

let ffmpeg;
let clients = []; // Lista de clientes conectados
const audioStream = new PassThrough({ highWaterMark: 1024 * 64 });

function startFFmpeg() {
  console.log("🔄 Iniciando FFmpeg...");

  if (ffmpeg) ffmpeg.kill(); // Matar proceso anterior si existe

  ffmpeg = spawn("ffmpeg", [
    "-re",
    "-f", "dshow",
    "-rtbufsize", "64k",
    "-i", `audio=${audioDevice}`,
    "-ac", "2",
    "-ar", "44100",
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "-f", "mp3",
    "pipe:1"
  ]);

  ffmpeg.stdout.pipe(audioStream); // Pasar los datos a nuestro stream

  ffmpeg.stderr.on("data", (data) => {

    console.error(`⚠️ FFmpeg: ${data}`);
  });
  

  ffmpeg.on("close", () => {
    console.warn("⚠️ FFmpeg se ha cerrado.");
    if (clients.length > 0) {
      console.log("🔄 Reiniciando FFmpeg en 3 segundos...");
      setTimeout(startFFmpeg, 3000);
    }
  });
}

// Iniciar FFmpeg
startFFmpeg();

app.get("/audio", (req, res) => {
  res.setHeader("Content-Type", "audio/mp3");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Expires", "0");
  res.setHeader("Pragma", "no-cache");

  console.log("✅ Cliente conectado.");

  clients.push(res);
  audioStream.pipe(res); // Enviar el stream de audio al cliente

  req.on("close", () => {
    console.log("❌ Cliente desconectado.");
    clients = clients.filter(client => client !== res);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`🎵 Streaming disponible en: http://localhost:${PORT}/audio`);
});
