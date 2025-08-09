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

    const isContainerized = true; // audio/webm;codecs=opus
    const audioEncoding = process.env.AUDIO_ENCODING || 'linear16';
    const sampleRate = parseInt(process.env.SAMPLE_RATE || 16000, 10);

    let deepgramLive;
    try {
      const options = {
        model: 'nova-3',
        language: 'en',
        punctuate: true,
        interim_results: true
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
      ws.close();
      return;
    }

    deepgramLive.on('open', () => {
      console.log("🔵 Deepgram connection opened");
    });

    deepgramLive.on('close', (code, reason) => {
      console.log(`🔴 Deepgram connection closed. Code: ${code}, Reason: ${reason ? reason.toString() : 'No reason provided'}`);
    });

    deepgramLive.on('error', (error) => {
      console.error("❗ Deepgram Error:", error);
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
      if (deepgramLive && deepgramLive.getReadyState() === WebSocket.OPEN) {
        deepgramLive.send(message);
        console.log("Sent audio chunk to Deepgram");
      } else {
        console.warn("⚠️ Deepgram WebSocket not open, cannot send audio chunk");
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
