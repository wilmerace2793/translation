const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
console.log('hola ingrese')
recognition.onerror = (event) => {
    console.error("Error en el reconocimiento:", event.error);
};
if (SpeechRecognition) {
    const recognition = new SpeechRecognition(); // Definir la variable antes de usarla
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = false;

    async function translateText(text, sourceLang, targetLang) {
        try {
            const res = await fetch("http://localhost:5000/translate", {
                method: "POST",
                body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: "text" }),
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) throw new Error("Error en la traducción");

            const data = await res.json();
            return data.translatedText;
        } catch (error) {
            console.error("Error en la traducción:", error);
            return text;
        }
    }

    recognition.onresult = async (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim();
        console.log("Escuchado:", text);

        const targetLang = recognition.lang === "es-ES" ? "en" : "es";
        const translatedText = await translateText(text, recognition.lang, targetLang);

        console.log("Traducido:", translatedText);
        showTranslationOverlay(translatedText);
    };

    function showTranslationOverlay(text) {
        let overlay = document.getElementById("translation-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "translation-overlay";
            overlay.style.position = "fixed";
            overlay.style.bottom = "10px";
            overlay.style.right = "10px";
            overlay.style.background = "rgba(0,0,0,0.7)";
            overlay.style.color = "#fff";
            overlay.style.padding = "10px";
            overlay.style.borderRadius = "5px";
            overlay.style.zIndex = "9999";
            document.body.appendChild(overlay);
        }
        overlay.innerText = text;
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "t") {
            recognition.start();
            console.log("Reconocimiento de voz iniciado.");
        }
    });

} else {
    console.log("Tu navegador no soporta reconocimiento de voz.");
}
