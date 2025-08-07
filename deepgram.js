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
      smart_format: true,
      // אין צורך ב־encoding/sample_rate כאשר משתמשים ב־opus
      utterance_end_ms: 2000,
    });

    // KeepAlive כל 15 שניות
    const keepAliveInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'keepalive' }));
      }
    }, 15000);

    deepgramLive.on('transcriptReceived', (data) => {
      console.log("📥 Raw response from Deepgram:");
      console.dir(data, { depth: null });

      const transcript = data.channel.alternatives[0]?.transcript;
      const isFinal = data.is_final;

      if (transcript && transcript.trim() !== "") {
        console.log(`📝 Transcript (${isFinal ? 'final' : 'interim'}):`, transcript);
        ws.send(JSON.stringify({ transcript, is_final: isFinal }));
      }
    });

    deepgramLive.on('error', (error) => {
      console.error("Deepgram Error:", error);
      ws.close();
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      deepgramLive.finish();
      clearInterval(keepAliveInterval);
    });

    ws.on('message', (message) => {
      deepgramLive.send(message);
    });
  });
}

module.exports = startWebSocketServer;
