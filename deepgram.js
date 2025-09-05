const WebSocket = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const express = require('express'); // אם צריך app

const { translateText } = require('./azure-translator'); // שימוש בפונקציית התרגום

const { synthesizeTextToBase64 } = require('./google-tts'); // שימוש בפונקציית הקולית

module.exports = function startWebSocketServer(server, app) {
  const wss = new WebSocket.Server({ server }); // server מגיע מ-index.js

  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    throw new Error("⚠️ Missing DEEPGRAM_API_KEY in environment variables");
  }

  const deepgramClient = createClient(deepgramApiKey);

const setupDeepgram = (ws, getLastChunkTime, pendingItemsRef, checkClose) => {
    const deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'multi',
      dictation: true, 
      punctuate: true,
      utterances: true,
      diarize: true,
      numerals: true,
      paragraphs: true,
      interim_results: false,
      endpointing: 100,
      vad_events: true
    });

    let keepAlive = setInterval(() => {
    console.log("deepgram: keepalive");
    deepgram.keepAlive();
  }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async() => {
      console.log("🔗 deepgram: connected");
});
deepgram.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
  const last = typeof getLastChunkTime === 'function' ? getLastChunkTime() : null;
  const latency = last ? (Date.now() - last) : null;      
  console.log("📦 Full transcript event:", JSON.stringify(data, null, 2));
        console.log("✅ WebSocket received transcript from deepgram", latency ? `Latency: ${latency} ms` : '');
        console.log("✅ WebSocket sent transcript to client");
  
    // נשלח ללקוח את התמלול המקורי ישירות (כדי להתאים לצד הלקוח)
try {
  pendingItemsRef.value++;
  ws.send(JSON.stringify(data));
} catch (err) {
  console.error("❌ Error sending transcript:", err);
} finally {
  pendingItemsRef.value--;
  checkClose();
}

  // כאן נגדיר פעם אחת את שפת המקור ושפת היעד
const sourceLang = "en";  // השפה בה אתה מדבר
const targetLang = "ru";  // השפה ל-TTS ותרגום
  
    // נתרגם את התמלול 
  const transcriptText = data?.channel?.alternatives?.[0]?.transcript;
   let translated = null;
  if (transcriptText) {
         try {
           pendingItemsRef.value++; // ✅ התחלנו תהליך תרגום
      translated = await translateText(transcriptText, targetLang, sourceLang);
      console.log("🌍 Translated text:", translated);

      // שולח ללקוח הודעה חדשה עם התרגום
      ws.send(JSON.stringify({
        type: "translation",
        payload: { original: transcriptText, translated }
      }));
           pendingItemsRef.value--; // ✅ תהליך תרגום הסתיים
           checkClose();
    } catch (err) {
      console.error("❌ Translation error:", err);
    }
    if (translated) {
      try {
      // יוצר אודיו ב-Google TTS מהתרגום
      const textForTTS = translated?.[targetLang] || "";
        console.log("📢 Sending to Google TTS:", textForTTS);
        pendingItemsRef.value++; // ✅ התחלנו תהליך TTS
    const audioBase64 = await synthesizeTextToBase64(textForTTS);
    // שולח ללקוח את האודיו
  ws.send(JSON.stringify({
    type: "tts",
    payload: { audioBase64 }
  }));
       pendingItemsRef.value--; // ✅ תהליך TTS הסתיים
        checkClose();
} catch (err) {
  console.error("❌ Google TTS error:", err);
  }
}
}
});
    
      deepgram.addListener(LiveTranscriptionEvents.Close, async() => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive);
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, async(error) => {
        console.log("⚠️ deepgram: error received");
        console.error(error);
      });

      deepgram.addListener(LiveTranscriptionEvents.Warning, async(warning) => {
        console.log("⚠️ deepgram: warning received");
        console.warn(warning);
      });

      deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
        const detectedLang = data?.detected_language || "unknown";
        const tier = data?.tier || "unknown";
        const models = data?.models || "-";
        console.log(`deepgram: metadata received – Detected language: ${detectedLang}, Tier: ${tier}, Models: ${models}`);
        ws.send(JSON.stringify({ metadata: data }));
      });
    

    return { deepgram, keepAlive };
  };// <-- סוף setupDeepgram

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");
  let lastChunkTime = null;
const getLastChunkTime = () => lastChunkTime;
      let isRecording = true; // ✅ ברירת מחדל - מקליטים
      let pendingItemsRef = { value: 0 }; // מספר פריטים בהמתנה לשליחה ללקוח
      let stopRequested = false;
      let { deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime, pendingItemsRef, checkClose);
 
ws.on('message', (message) => {
  // ננסה לפרש אם זו הודעת שליטה (stop) או אודיו
  let parsed;
  try {
    parsed = JSON.parse(message.toString());
  } catch (e) {
    parsed = null;
  }

  // ✅ הודעת שליטה מהלקוח
if (parsed && parsed.type === "control") {
  if (parsed.action === "stop") {
    console.log("⏸️ Recording stopped by client");
    isRecording = false; // מפסיקים לשלוח אודיו חדש
    stopRequested = true; // חדש: מציין שצריך להפסיק רק אחרי שהכול הגיע ללקוח
  }
  return; // לא לשלוח הודעות שליטה ל־Deepgram
}

  // ✅ רק אם עדיין מקליטים - נשלח את האודיו ל־Deepgram
  console.log('Received audio chunk, size:', message.length); // 🟢 חזרנו להדפיס גם את הגודל
  if (isRecording && deepgram.getReadyState() === 1) {
    lastChunkTime = Date.now();
    console.log("✅ WebSocket sent audio chunk to deepgram");
    deepgram.send(message);
  } else if (!isRecording) {
    console.log("⚠️ Recording paused, audio chunk ignored");
  } else if (deepgram.getReadyState() >= 2) { // CLOSING / CLOSED
    console.log("⚠️ WebSocket couldn't be sent data to deepgram");
    console.log("⚠️ Deepgram connection closed, retrying...");
    deepgram.finish();
    deepgram.removeAllListeners();
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }
({ deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime, pendingItemsRef, checkClose));
  } else {
    console.log("⚠️ Deepgram socket not ready (probably CONNECTING state)"); 
  }
});
     
    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
    if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
  // מבטיח שכל הקבצים שכבר התקבלו יעובדו
 if (deepgram) {
  if (!stopRequested || pendingItemsRef.value === 0) {
    deepgram.finish();             // מסיים תמלול רק כשבאמת מותר
    deepgram.removeAllListeners();
  }
}
  });

    function checkClose() {
  if (stopRequested && pendingItemsRef.value === 0) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
      console.log("🔌 WebSocket closed after all processing finished");
    }
  }
}

}; // סוף startWebSocketServer

