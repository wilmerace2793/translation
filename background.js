chrome.runtime.onInstalled.addListener(() => {
    console.log("Extensión instalada correctamente.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "translate") {
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(message.text)}&langpair=es|en`)
            .then(response => response.json())
            .then(data => sendResponse({ translatedText: data.responseData.translatedText }))
            .catch(error => console.error("Error en la traducción:", error));

        return true; // Permite respuesta asíncrona
    }
});

async function translateText(text, sourceLang, targetLang) {
    try {
        const res = await fetch("http://localhost:5000/translate", {  // Cambia la URL si tu servidor está en otro host/puerto
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