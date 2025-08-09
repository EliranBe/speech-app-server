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

    // הגדרת פורמט האודיו לפי containerized WebM/Opus
    const isContainerized = true;
    const audioEncoding = process.env.AUDIO_ENCODING || 'linear16';
    const sampleRate = parseInt(process.env.SAMPLE_RATE || 16000, 10);

    let deepgramLive;
    try {
      const options = {
        model: 'nova-3',
        language: 'en',
        punctuate: true,
        interim_results: true,
      };

      if (!isContainerized) {
        options.encoding = audioEncoding;
        options.sample_rate = sampleRate;
      } else {
        console.log("📦 Using containerized audio (WebM/Opus) — skipping encoding/sample_rate");
      }

      deepgramLive = await deepgram.listen.live(options);

    } catch (err) {
      console.error("❌ Failed to connect to Deepgram:", err);
      // כאן לא סוגרים את ה-ws אוטומטית, תן ללקוח להחליט
      return;
    }

    deepgramLive.on('open', () => {
      console.log("🔵 Deepgram connection opened");
    });

    deepgramLive.on('close', (code, reason) => {
      console.log(`🔴 Deepgram connection closed. Code: ${code}, Reason: ${reason}`);
      // אפשר לשקול להודיע ללקוח כאן או לנקות משאבים
    });

    deepgramLive.on('error', (error) => {
      console.error("Deepgram Error:", error);
      // אל תסגור אוטומטית את ה-ws
    });

    deepgramLive.on('transcriptReceived', (data) => {
      try {
        const transcript = data.channel.alternatives[0]?.transcript;
        const isFinal = data.is_final || false;
        if (transcript) {
          ws.send(JSON.stringify({ transcript, isFinal }));
          console.log(`📢 Transcript${isFinal ? ' (final)' : ' (interim)'}: ${transcript}`);
        }
      } catch (err) {
        console.error("⚠️ Error parsing Deepgram transcript:", err);
      }
    });

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);
      if (deepgramLive && deepgramLive.getReadyState() === WebSocket.OPEN) {
        deepgramLive.send(message);
        console.log('Sent audio chunk to Deepgram');
      } else {
        console.warn('⚠️ Deepgram WebSocket not open, cannot send audio chunk');
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      if (deepgramLive) {
        deepgramLive.finish();
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
    });
  });
}

module.exports = startWebSocketServer;
