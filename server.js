const express = require("express");
const { spawn } = require("child_process");
const { PassThrough } = require("stream");
const WebSocket = require("ws");

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
    "-f", "dshow",
    "-rtbufsize", "1024M", // Buffer más grande
    "-probesize", "100M",
    "-analyzeduration", "100M",
    "-i", `audio=${audioDevice}`,
    "-ac", "2",
    "-ar", "44100",
    "-filter_complex", "aresample=async=1:min_hard_comp=0.100:first_pts=0",
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "-f", "mp3",
    "pipe:1",
  ]);

  let lastDataTime = Date.now();

  // Verificar si FFmpeg sigue activo
  setInterval(() => {
    if (Date.now() - lastDataTime > 30000) { // Si pasan 30s sin datos, reiniciar
      console.warn("⚠️ No hay datos de FFmpeg. Reiniciando...");
      startFFmpeg();
    }
  }, 10000);

  ffmpeg.stdout.on("data", (data) => {
    lastDataTime = Date.now();
    audioStream.write(data); // Escribir datos al stream
  });

  ffmpeg.stderr.on("data", (data) => {
    console.error(`⚠️ FFmpeg: ${data.toString()}`);
  });

  ffmpeg.on("close", () => {
    console.warn("⚠️ FFmpeg se ha cerrado.");
    setTimeout(startFFmpeg, 3000);
  });
}

// Iniciar FFmpeg
startFFmpeg();

app.get("/audio", (req, res) => {
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  console.log("✅ Cliente conectado.");

  clients.push(res);
  audioStream.pipe(res);

  req.on("close", () => {
    console.log("❌ Cliente desconectado.");
    clients = clients.filter((client) => client !== res);
    res.end();
  });
});

const wss = new WebSocket.Server({ port: 8081 });
const audioBuffer = []; // Acumulador de audio

/*wss.on("connection", (ws) => {
  console.log("✅ Cliente WebSocket conectado");

  let processing = false;

  audioStream.on("data", (chunk) => {
    audioBuffer.push(chunk);
    console.log("Buffer length:", audioBuffer.length);

    if (!processing && audioBuffer.length >= 30) {
      processing = true; // Bloquear nuevos procesos hasta que termine el actual

      const fullAudio = Buffer.concat(audioBuffer);
      audioBuffer.length = 0; // Limpiar buffer después de concatenar

      const pythonProcess = spawn("python", ["transcribe.py"], {
        stdio: ["pipe", "pipe", "inherit"],
      });

      pythonProcess.stdin.write(fullAudio);
      pythonProcess.stdin.end();

      pythonProcess.stdout.on("data", (data) => {
        const text = data.toString().trim();
        if (text && ws.readyState === ws.OPEN) {
          ws.send(text);
        }
      });

      pythonProcess.on("exit", () => {
        processing = false; // Solo cuando termine el proceso, permitimos otro
      });

      pythonProcess.on("error", (err) => {
        console.error("Error en proceso Python:", err);
        processing = false;
      });
    }
  });

  ws.on("close", () => {
    console.log("❌ Cliente WebSocket desconectado");
  });
});*/


app.listen(PORT, () => {
  console.log(`🎵 Streaming disponible en: http://localhost:${PORT}/audio`);
  console.log(`🎙️ Transcripción disponible en: ws://localhost:8081`);
});