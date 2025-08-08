// deepgram.js
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

    let deepgramLive = null;
    let readyToForward = false;
    let bufferQueue = [];
    let keepAliveInterval = null;

    try {
      deepgramLive = await deepgram.listen.live({
        model: 'nova-3',
        language: 'en',
        punctuate: true,
        interim_results: true,
        smart_format: true,
        encoding: 'opus',
        sample_rate: 48000,
        utterance_end_ms: 1500
      });

      readyToForward = true;
      console.log("✅ Deepgram live stream ready");

      if (bufferQueue.length > 0) {
        console.log(`⏳ Flushing ${bufferQueue.length} buffered audio chunks to Deepgram`);
        for (const chunk of bufferQueue) {
          try {
            deepgramLive.send(chunk);
          } catch (err) {
            console.error("❌ Error sending buffered chunk to Deepgram:", err);
          }
        }
        bufferQueue = [];
      }

      deepgramLive.on('transcriptReceived', (data) => {
        console.log("📥 Raw Deepgram Response:", JSON.stringify(data));

        const isFinal = !!data.is_final;
        const transcript = data.channel?.alternatives?.[0]?.transcript || "";

        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ transcript, is_final: isFinal }));
        }
      });

      deepgramLive.on('error', (error) => {
        console.error("Deepgram Error:", error);
        try { ws.close(); } catch(e) {}
      });

    } catch (err) {
      console.error("❌ Failed to create Deepgram live stream:", err);
      try {
        ws.send(JSON.stringify({ error: "Deepgram init error" }));
      } catch (e) {}
      ws.close();
      return;
    }

    keepAliveInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(JSON.stringify({ type: 'keepalive' })); } catch (e) {}
      }
    }, 15000);

    ws.on('message', (message) => {
      const size = (message && (message.length || message.byteLength)) ? (message.length || message.byteLength) : 'unknown';
      if (!readyToForward) {
        bufferQueue.push(message);
        console.log(`🔁 Buffered audio chunk (size=${size}) – Deepgram not ready yet (buffer size=${bufferQueue.length})`);
        if (bufferQueue.length > 200) {
          bufferQueue.shift();
          console.warn("⚠️ bufferQueue exceeded 200 chunks — dropping oldest chunk");
        }
        return;
      }

      try {
        deepgramLive.send(message);
      } catch (err) {
        console.error("❌ Failed forwarding audio chunk to Deepgram:", err);
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      try {
        if (deepgramLive) deepgramLive.finish();
      } catch (e) {}
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    });

    ws.on('error', (err) => {
      console.error("WebSocket error:", err);
      try { ws.close(); } catch(e) {}
    });

  });
}

module.exports = startWebSocketServer;
