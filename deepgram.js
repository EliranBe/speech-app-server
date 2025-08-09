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

    // 🎯 הגדרת קידוד וקצב דגימה לפי מה שהלקוח משתמש
    // אם הלקוח שולח MediaRecorder ב-webm/opus -> encoding: 'opus', sample_rate: 48000
    // אם שולח PCM16 -> encoding: 'linear16', sample_rate: 16000
    const audioEncoding = process.env.AUDIO_ENCODING || 'linear16';
    const sampleRate = parseInt(process.env.SAMPLE_RATE || (audioEncoding === 'opus' ? 48000 : 16000), 10);

    let deepgramLive;
    try {
      // הכנת האופציות ל-Deepgram
      const options = {
        model: 'nova-3',
        language: 'multi',
        punctuate: true,
        interim_results: true,
        endpointing: 500,
        vad_events: true
      };

      // אם זה לא containerized audio (opus), נוסיף encoding ו-sample_rate
      if (audioEncoding !== 'opus') {
        options.encoding = audioEncoding;
        options.sample_rate = sampleRate;
      }

      deepgramLive = await deepgram.listen.live(options);
    } catch (err) {
      console.error("❌ Failed to connect to Deepgram:", err);
      ws.close();
      return;
    }

    deepgramLive.on('open', () => {
      console.log(`🔵 Deepgram connection opened (${audioEncoding}, ${sampleRate}Hz)`);

      // שליחת KeepAlive כל 3 שניות
      const KEEP_ALIVE_INTERVAL = 3000;
      const keepAliveInterval = setInterval(() => {
        if (deepgramLive.getReadyState() === WebSocket.OPEN) {
          deepgramLive.send(JSON.stringify({ type: "KeepAlive" }));
          console.log("⏸️ Sent KeepAlive message to Deepgram");
        }
      }, KEEP_ALIVE_INTERVAL);

      // ניקוי המחזור כשחיבור נסגר
      deepgramLive.on('close', () => {
        clearInterval(keepAliveInterval);
        console.log("🔴 Deepgram connection closed, stopped KeepAlive");
      });

      // ניקוי המחזור במקרה של שגיאה
      deepgramLive.on('error', (err) => {
        clearInterval(keepAliveInterval);
        console.error("Deepgram connection error:", err);
      });
    });

    deepgramLive.on('close', () => {
      console.log("🔴 Deepgram connection closed");
    });

    deepgramLive.on('error', (error) => {
      console.error("Deepgram Error:", error);
      ws.close();
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
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      if (deepgramLive) {
        deepgramLive.finish();
      }
    });
  });
}

module.exports = startWebSocketServer;
