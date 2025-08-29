const WebSocket = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const express = require('express'); // אם צריך app

const { translateText } = require('./azure-translator'); // שימוש בפונקציית התרגום

module.exports = function startWebSocketServer(server, app) {
  const wss = new WebSocket.Server({ server }); // server מגיע מ-index.js

  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    throw new Error("⚠️ Missing DEEPGRAM_API_KEY in environment variables");
  }

  const deepgramClient = createClient(deepgramApiKey);

const setupDeepgram = (ws, getLastChunkTime) => {
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
      interim_results: true,
      utterance_end_ms: 1000,  //When using utterance_end_ms, setting interim_results=true is also required.//
      endpointing: 100,
      vad_events: true
    });

    let keepAlive = setInterval(() => {
    console.log("deepgram: keepalive");
    deepgram.keepAlive();
  }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async() => {
      console.log("🔗 deepgram: connected");

deepgram.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
  const last = typeof getLastChunkTime === 'function' ? getLastChunkTime() : null;
  const latency = last ? (Date.now() - last) : null;      
  console.log("📦 Full transcript event:", JSON.stringify(data, null, 2));
        console.log("✅ WebSocket received transcript from deepgram", latency ? `Latency: ${latency} ms` : '');
        console.log("✅ WebSocket sent transcript to client");
  
    // נשלח ללקוח את התמלול המקורי ישירות (כדי להתאים לצד הלקוח)
  ws.send(JSON.stringify(data));

    // אם יש טקסט סופי (לא interim), נתרגם אותו
  const transcriptText = data?.channel?.alternatives?.[0]?.transcript;
  if (transcriptText) {
    try {
      const translated = await translateText(transcriptText, "he", "en");
      console.log("🌍 Translated text:", translated);

      // שולח ללקוח הודעה חדשה עם התרגום
      ws.send(JSON.stringify({
        type: "translation",
        payload: { original: transcriptText, translated }
      }));
    } catch (err) {
      console.error("❌ Translation error:", err);
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
    });

    return { deepgram, keepAlive };
  };

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");
  let lastChunkTime = null;
const getLastChunkTime = () => lastChunkTime;
      let { deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime);


    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);      
      if (deepgram.getReadyState() === 1) { // OPEN
        lastChunkTime = Date.now();
        console.log("✅ WebSocket sent data to deepgram");
        deepgram.send(message);
      } else if (deepgram.getReadyState() >= 2) { // CLOSING / CLOSED
        console.log("⚠️ WebSocket couldn't be sent data to deepgram");
        console.log("⚠️ WebSocket retrying connection to deepgram");
        deepgram.finish();
        deepgram.removeAllListeners();
  if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
  ({ deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime));  // ✅ עדכון גם של keepAlive
} else {
        console.log("⚠️ WebSocket couldn't be sent data to deepgram");
      }  
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
    if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = null;
         });
  });
};
