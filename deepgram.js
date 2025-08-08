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

    // prepare variables
    let deepgramLive = null;
    let readyToForward = false;
    let bufferQueue = [];
    let keepAliveInterval = null;

    // create Deepgram live stream (await) and set handlers
    try {
      deepgramLive = await deepgram.listen.live({
        model: 'nova-3',
        language: 'en',
        punctuate: true,
        interim_results: true,
        smart_format: true,
        // נסה להפעיל no_delay אם ה־SDK תומך בזה (אפשר לבחון)
        // no_delay: true,
        utterance_end_ms: 2000,
      });

      readyToForward = true;
      console.log("✅ Deepgram live stream ready");

      // flush any buffered audio chunks that arrived before deepgramLive was ready
      if (bufferQueue.length > 0) {
        console.log(`⏳ Flushing ${bufferQueue.length} buffered audio chunks to Deepgram`);
        for (const chunk of bufferQueue) {
          try {
            deepgramLive.send(chunk);
          } catch (err) {
            console.error("❌ Error sending buffered chunk to Deepgram:", err);
          }
        }
        bufferQueue = []; // free
      }

      // handle transcript events from Deepgram
      deepgramLive.on('transcriptReceived', (data) => {
        // raw debug dump
        console.log("📥 Raw response from Deepgram:");
        console.dir(data, { depth: null });

        const transcript = data?.channel?.alternatives?.[0]?.transcript;
        const isFinal = !!data.is_final;

        if (transcript && transcript.trim() !== "") {
          console.log(`📝 Transcript (${isFinal ? 'final' : 'interim'}):`, transcript);
          // forward to client
          try {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ transcript, is_final: isFinal }));
            }
          } catch (err) {
            console.error("❌ Error sending transcript to client:", err);
          }
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

    // KeepAlive to client so intermediate proxies/TCP do not close the WS
    keepAliveInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(JSON.stringify({ type: 'keepalive' })); } catch (e) {}
      }
    }, 15000);

    // When client sends audio chunks
    ws.on('message', (message) => {
      // message is typically a Buffer (binary)
      const size = (message && (message.length || message.byteLength)) ? (message.length || message.byteLength) : 'unknown';
      if (!readyToForward) {
        // buffer while Deepgram stream is not ready
        bufferQueue.push(message);
        console.log(`🔁 Buffered audio chunk (size=${size}) — deepgramLive not ready yet (buffer size=${bufferQueue.length})`);
        // safety: if buffer too large, drop oldest
        if (bufferQueue.length > 200) {
          bufferQueue.shift();
          console.warn("⚠️ bufferQueue exceeded 200 chunks — dropping oldest chunk to avoid memory growth");
        }
        return;
      }

      // forward immediately
      try {
        deepgramLive.send(message);
        console.log(`⬆ Forwarded audio chunk to Deepgram (size=${size})`);
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
