const { WebSocketServer } = require('ws');
const { createClient } = require('@deepgram/sdk');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}

const deepgram = createClient(deepgramApiKey);

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws) => {
    console.log("🔗 Client connected to WebSocket");

    const deepgramLive = await deepgram.listen.live({
      model: 'nova-3',
      language: 'en',
      punctuate: true,
      interim_results: true,
      encoding: 'opus',          // ✅ הוספת פורמט האודיו
      sample_rate: 48000         // ✅ קצב דגימה תואם ל-MediaRecorder
    });

    deepgramLive.on('open', () => {
      console.log("🔵 Deepgram connection opened");
    });

    deepgramLive.on('close', () => {
      console.log("🔴 Deepgram connection closed");
    });

    deepgramLive.on('error', (error) => {
      console.error("Deepgram Error:", error);
      ws.close();
    });

    deepgramLive.on('transcriptReceived', (data) => {
      console.log('🛎️ Deepgram transcriptReceived data:', JSON.stringify(data));
      const transcript = data.channel.alternatives[0]?.transcript;
      const isFinal = data.is_final || false;
      if (transcript) {
        ws.send(JSON.stringify({ transcript, isFinal }));
        console.log(`📢 Transcript${isFinal ? ' (final)' : ' (interim)'}: ${transcript}`);
      }
    });

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);
      if (deepgramLive.getReadyState() === WebSocket.OPEN) { // ✅ הגנה אם החיבור עדיין פתוח
        deepgramLive.send(message);
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      deepgramLive.finish();
    });
  });
}

module.exports = startWebSocketServer;
