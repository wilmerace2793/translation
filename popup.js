const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    document.getElementById("status").innerText = "Tu navegador no soporta reconocimiento de voz.";
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES"; // Idioma inicial
    recognition.continuous = true;
    recognition.interimResults = false;

    let isListening = false;

    async function detectLanguage(text) {
        try {
            const res = await fetch("http://localhost:5000/detect", {
                method: "POST",
                body: JSON.stringify({ q: text }),
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) throw new Error(`Error en detección de idioma: ${res.statusText}`);

            const data = await res.json();
            return data[0].language; // Retorna "es" o "en"
        } catch (error) {
            console.error("Error en detección de idioma:", error);
            return "es"; // Valor por defecto en caso de error
        }
    }

    async function translateText(text, sourceLang, targetLang) {
        try {
            const res = await fetch("http://localhost:5000/translate", {
                method: "POST",
                body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: "text" }),
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) throw new Error(`Error en la traducción: ${res.statusText}`);

            const data = await res.json();
            return data.translatedText;
        } catch (error) {
            console.error("Error en la traducción:", error);
            return text; // Devuelve el texto original en caso de error
        }
    }

    function speakText(text, lang) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
    
        // Configurar parámetros para que suene más natural
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
    
        // Obtener todas las voces disponibles
        const voices = speechSynthesis.getVoices();
    
        // Seleccionar la voz específica si está disponible
        const preferredVoice = voices.find(voice => voice.name === "Microsoft Brian Online (Natural) - English (United States)");
    
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        } else {
            const defaultVoice = voices.find(voice => voice.lang.startsWith(lang));
            if (defaultVoice) {
                utterance.voice = defaultVoice;
            }
        }
    
        speechSynthesis.speak(utterance);
    }

    recognition.onresult = async (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim();
        console.log("Escuchado:", text);
        document.getElementById("status").innerText = `Dijiste: "${text}"`;

        const detectedLang = await detectLanguage(text);
        const targetLang = detectedLang === "es" ? "en" : "es";

        const translatedText = await translateText(text, detectedLang, targetLang);
        console.log("Traducido:", translatedText);
        speakText(translatedText, targetLang === "es" ? "es-ES" : "en-US");

        // Cambiar idioma dinámicamente según la detección
        recognition.lang = detectedLang === "es" ? "es-ES" : "en-US";
    };

    function restartRecognition() {
        if (!isListening) {
            setTimeout(() => {
                isListening = true;
                recognition.start();
                document.getElementById("status").innerText = "Escuchando...";
            }, 1000);
        }
    }

    recognition.onend = () => {
        console.log("Reconocimiento finalizado, reiniciando...");
        isListening = false;
        restartRecognition();
    };

    recognition.onerror = (event) => {
        console.error("Error en reconocimiento de voz:", event.error);
        if (event.error === "aborted") return;

        isListening = false;
        restartRecognition();
    };

    document.getElementById("start").addEventListener("click", () => {
        console.log("Iniciando reconocimiento de voz...");
        if (!isListening) {
            isListening = true;
            recognition.start();
            document.getElementById("status").innerText = "Escuchando...";
        }
    });
}
