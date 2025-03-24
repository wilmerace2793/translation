import whisper
import ffmpeg
import tempfile
import os
import requests
import json

# Configuración
stream_url = "http://localhost:8080/audio"
libretranslate_url = "http://localhost:5000/translate"

# Cargar modelo Whisper
model = whisper.load_model("small")

while True:
    try:
        # Crear archivo temporal para audio
        temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name

        # Capturar audio (sin logs molestos)
        ffmpeg.input(stream_url, t=5).output(temp_audio, format="wav", acodec="pcm_s16le", ac=1, ar="16k").run(overwrite_output=True, quiet=True)

        # Verificar si el archivo se generó correctamente
        if not os.path.exists(temp_audio) or os.path.getsize(temp_audio) == 0:
            continue  # Si no hay audio válido, saltar

        # Transcribir el audio en inglés
        result = model.transcribe(temp_audio, language="English", fp16=False)
        transcribed_text = result.get("text", "").strip()
        os.remove(temp_audio)  # Eliminar el archivo de audio temporal

        if not transcribed_text:
            continue  # Si no hay texto, saltar

        # Traducir a español
        response = requests.post(
            libretranslate_url,
            data={"q": transcribed_text, "source": "en", "target": "es", "format": "text"},
        )

        if response.status_code == 200:
            translated_text = response.json().get("translatedText", "Error en la traducción")
            print(f"Inglés: {transcribed_text}")
            print(f"Español: {translated_text}\n")

            # Guardar en JSON
            with open("transcripcion_traduccion.json", "a", encoding="utf-8") as f:
                json.dump({"original": transcribed_text, "translated": translated_text}, f, ensure_ascii=False, indent=4)
                f.write("\n")

    except Exception as e:
        print(f"Error: {e}")
