const { WebSocketServer } = require('ws');
const { createClient } = require('@deepgram/sdk');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

if (!deepgramApiKey) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}

// יצירת לקוח Deepgram גרסה 3
const deepgram = createClient(deepgramApiKey);

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws) => {
    console.log("🔗 Client connected to WebSocket");

    // יצירת סטרים חדש עם interim_results true לקבלת תמלול בזמן אמת
    const deepgramLive = await deepgram.listen.live({
      model: 'nova-3',
      language: 'en', // חשוב: עברית אינה נתמכת כרגע
      punctuate: true,
      interim_results: true,
      encoding: 'webm',      // הוסף encoding
      sample_rate: 48000,    // הוסף sample_rate מתאים לדפדפן
    });

    // קבלת תמלול ושליחה ללקוח
    deepgramLive.on('transcriptReceived', (data) => {
      console.log('🛎️ Deepgram transcriptReceived data:', JSON.stringify(data)); // לוג מפורט
      const transcript = data.channel.alternatives[0]?.transcript;
      const isFinal = data.is_final || false;
      if (transcript) {
        ws.send(JSON.stringify({ transcript, isFinal }));
        console.log(`📢 Transcript${isFinal ? ' (final)' : ' (interim)'}: ${transcript}`);
      }
    });

    deepgramLive.on('error', (error) => {
      console.error("Deepgram Error:", error);
      ws.close();
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      deepgramLive.finish();
    });

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);
      deepgramLive.send(message);
    });
  });
}

module.exports = startWebSocketServer;
