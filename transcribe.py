import ffmpeg
import speech_recognition as sr
import os
import subprocess
import tempfile
import time

STREAM_URL = "http://localhost:8080/audio"

def convertir_tiempo(segundos):
    """Convierte segundos a formato mm:ss"""
    minutos = int(segundos // 60)
    segundos = int(segundos % 60)
    return f"{minutos:02}:{segundos:02}"

def grabar_audio():
    recognizer = sr.Recognizer()
    tiempo_inicio = None  # Guarda el inicio de la voz
    tiempo_fin = None  # Guarda el final de la voz
    tiempo_audio = 0  # Tiempo total transcurrido

    try:
        print("🎙️ Capturando y transcribiendo audio en tiempo real... (presiona Ctrl+C para detener)")

        while True:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_filename = temp_audio.name

            start_time = time.time()  # Guarda el tiempo de inicio

            # Captura 5 segundos de audio
            process = subprocess.run([
                "ffmpeg",
                "-y",
                "-i", STREAM_URL,
                "-t", "5",
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                "-af", "highpass=f=200, lowpass=f=3000",
                "-f", "wav",
                temp_filename
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            if process.returncode != 0:
                print("❌ Error al capturar el audio con FFmpeg")
                print(process.stderr.decode())
                continue

            tiempo_audio += 5  # Sumamos 5 segundos al tiempo total de audio

            with sr.AudioFile(temp_filename) as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = recognizer.record(source)

            try:
                texto = recognizer.recognize_google(audio, language="es-ES")

                if not tiempo_inicio:  # Si no había una marca de inicio, la guardamos
                    tiempo_inicio = tiempo_audio - 5  # Restamos 5 segundos por el tiempo de grabación
                
                tiempo_fin = tiempo_audio  # Se actualiza el tiempo de finalización
                
                print(f"⏳ [{convertir_tiempo(tiempo_inicio)} - {convertir_tiempo(tiempo_fin)}] 🗣️ {texto}")

                tiempo_inicio = tiempo_audio  # Actualiza el inicio para la siguiente transcripción

            except sr.UnknownValueError:
                if tiempo_inicio is not None:
                    print(f"🔚 Fin de la conversación en {convertir_tiempo(tiempo_fin)}")
                    tiempo_inicio = None  # Reiniciamos la detección de inicio
                print("🤷 No se pudo entender el audio.")
            except sr.RequestError as e:
                print(f"⚠️ Error en la API de reconocimiento: {e}")

            os.remove(temp_filename)

    except KeyboardInterrupt:
        print("\n🛑 Transcripción detenida por el usuario.")

if __name__ == "__main__":
    grabar_audio()
