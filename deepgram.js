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
      deepgramLive = await deepgram.listen.live({
        model: 'nova-3',
        language: 'en',
        punctuate: true,
        interim_results: true,
        encoding: audioEncoding,
        sample_rate: sampleRate
      });
    } catch (err) {
      console.error("❌ Failed to connect to Deepgram:", err);
      ws.close();
      return;
    }

    deepgramLive.on('open', () => {
      console.log(`🔵 Deepgram connection opened (${audioEncoding}, ${sampleRate}Hz)`);
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
