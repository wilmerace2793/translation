const WebSocket = require('ws');
const { spawn } = require('child_process');

// Configura WebSocket
const wss = new WebSocket.Server({ port: 8080 }); // Cambia el puerto según sea necesario
wss.on('connection', (ws) => {
  console.log('Cliente conectado');
  
  // Configura la grabación de audio
  const outputFile = "-";  // Usa "-" para que FFmpeg no guarde el archivo
  const audioDevice = "Mezcla estéreo (Realtek High Definition Audio)"; // Usa el nombre exacto del dispositivo
  
  console.log("Iniciando grabación de audio del sistema...");
  
  const ffmpeg = spawn("ffmpeg", [
    "-f", "dshow",
    "-i", `audio=${audioDevice}`,
    "-ac", "2",
    "-ar", "44100",
    "-c:a", "pcm_s16le",
    "-f", "wav",  // Especifica el formato WAV
    "-flush_packets", "1",
    "pipe:1"  // Usa la tubería para enviar el audio a stdout
  ]);
  
  // Maneja la salida del audio
  ffmpeg.stdout.on("data", (data) => {
    // Envía los datos de audio a través del WebSocket
    console.log(`Datos de audio recibidos: ${data.length} bytes`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  
  ffmpeg.stderr.on("data", (data) => {
    
    console.log(`stderr: ${data}`);
  });
  
  ffmpeg.on("error", (err) => {
    console.error(`Error al ejecutar FFmpeg: ${err.message}`);
  });
  
  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg finalizó con código ${code}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(); // Cierra la conexión WebSocket cuando FFmpeg termina
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");
    ffmpeg.kill("SIGINT"); // Detén FFmpeg cuando el cliente se desconecta
  });
});

console.log("Servidor WebSocket escuchando en ws://localhost:8080");

