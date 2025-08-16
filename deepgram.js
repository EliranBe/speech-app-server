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

    let lastChunkTime = null;
    let readyToSendAudio = false;
    let deepgram;

    function createDeepgramConnection() {
      if (deepgram) {
        deepgram.finish();
        deepgram.removeAllListeners();
      }

      readyToSendAudio = false;

      deepgram = deepgramClient.listen.live({
        model: 'nova-3',
        smart_format: true,
        language: 'multi',
        punctuate: true,
        interim_results: true,
        endpointing: 100,
        vad_events: true
      });

      deepgram.addListener(LiveTranscriptionEvents.Open, () => {
        console.log("🔗 deepgram: connected");
        readyToSendAudio = true;
      });

      deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        const latency = lastChunkTime ? (Date.now() - lastChunkTime) : null;
        console.log("✅ WebSocket received transcript from deepgram", latency ? `Latency: ${latency} ms` : '');
        console.log("✅ WebSocket sent transcript to client");
        ws.send(JSON.stringify(data));

        const channel = data.channel;
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

      deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
        const detectedLang = data?.detected_language || "unknown";
        console.log(`deepgram: metadata received – Detected language: ${detectedLang}`);
        ws.send(JSON.stringify({ metadata: data }));
      });

      deepgram.addListener(LiveTranscriptionEvents.Close, () => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive);
        readyToSendAudio = false;
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.log("⚠️ deepgram: error received");
        console.error(error);
      });

      deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
        console.log("⚠️ deepgram: warning received");
        console.warn(warning);
      });

      if (keepAlive) clearInterval(keepAlive);
      keepAlive = setInterval(() => {
        if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
          console.log("deepgram: keepalive");
          deepgram.keepAlive();
        }
      }, 10000);
    }

    // יצירת חיבור ראשוני
    createDeepgramConnection();

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);

      if (!readyToSendAudio) {
        console.log("⚠️ Not ready to send audio yet, skipping chunk");
        return;
      }

      if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
        lastChunkTime = Date.now();
        deepgram.send(message);
      } else if (deepgram.getReadyState && deepgram.getReadyState() >= 2) {
        console.log("⚠️ deepgram connection closing/closed, reconnecting...");
        createDeepgramConnection();
      } else {
        console.log("⚠️ deepgram connection not open, can't send data");
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
      clearInterval(keepAlive);
      readyToSendAudio = false;
      if (deepgram) {
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = null;
      }
    });
  });
}

module.exports = startWebSocketServer;
