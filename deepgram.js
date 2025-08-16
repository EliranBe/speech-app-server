const { WebSocketServer } = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("⚠️ Missing DEEPGRAM_API_KEY in environment variables");
}

const deepgramClient = createClient(deepgramApiKey);

let keepAlive;

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");

    let deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'multi',
      punctuate: true,
      interim_results: true,
      endpointing: 100,
      vad_events: true  
    });

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
        console.log("deepgram: keepalive");
        deepgram.keepAlive();
      }
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, () => {
      console.log("🔗 deepgram: connected");
    });

deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
  const latency = lastChunkTime ? (Date.now() - lastChunkTime) : null;

  // שמירה על הלוגים המקוריים
  console.log("✅ WebSocket received transcript from deepgram", latency ? `Latency: ${latency} ms` : '');
  console.log("✅ WebSocket sent transcript to client");
  ws.send(JSON.stringify(data)); // שולח את כל המידע המקורי ללקוח

  // הדפסת התמלול והשפה בזמן אמת
  const channel = data.channel; // אובייקט אחד
  if (channel?.alternatives) {
    channel.alternatives.forEach(alt => {
      const transcript = alt.transcript || '';
      const detectedLanguage = alt.language || 'unknown';
      if (transcript) {
        console.log(`📝 Transcription [${detectedLanguage}]:`, transcript);
      }
    });
  }
});

    deepgram.addListener(LiveTranscriptionEvents.Close, () => {
      console.log("deepgram: disconnected");
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.log("⚠️ deepgram: error received");
      console.error(error);
      // אל תסגור את ה-ws כאן - תן ללוגיקה ב-ws.on('message') לנסות reconnect
    });

    deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
      console.log("⚠️ deepgram: warning received");
      console.warn(warning);
    });

      // 📌 Metadata: מידע על השפה והחיבור
    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
    const detectedLang = data?.detected_language || "unknown";
    console.log(`deepgram: metadata received – Detected language: ${detectedLang}`);
      ws.send(JSON.stringify({ metadata: data }));
    });

    
   // נוסיף משתנה שיחזיק זמני שליחה
let lastChunkTime = null;

ws.on('message', (message) => {
  console.log('Received audio chunk, size:', message.length);

   if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
    lastChunkTime = Date.now(); // שמירת הזמן שבו שלחנו
    deepgram.send(message);
  } else if (deepgram.getReadyState && deepgram.getReadyState() >= 2) {
    console.log("⚠️ deepgram connection closing/closed, reconnecting...");
    deepgram.finish();
    deepgram.removeAllListeners();
    deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'multi',
      punctuate: true,
      interim_results: true,
      endpointing: 100,
      vad_events: true
    });
  } else {
    console.log("⚠️ deepgram connection not open, can't send data");
  }
 });
    
    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
      clearInterval(keepAlive);
      deepgram.finish();
      deepgram.removeAllListeners();
       deepgram = null; // חשוב לאפס את המשתנה אחרי סגירה
    });
  });
}

module.exports = startWebSocketServer;
