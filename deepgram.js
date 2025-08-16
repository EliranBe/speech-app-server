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

    let deepgram;
    let readyToSendAudio = false;
    let pendingChunks = [];
    let lastChunkTime = null;

    function createDeepgramConnection() {
      if (deepgram) {
        deepgram.finish();
        deepgram.removeAllListeners();
      }

      deepgram = deepgramClient.listen.live({
        model: 'nova-3',
        smart_format: true,
        language: 'multi',
        punctuate: true,
        interim_results: true,
        endpointing: 100,
        vad_events: true,  
        sample_rate: 48000
      });

      readyToSendAudio = false;

      if (keepAlive) clearInterval(keepAlive);
      keepAlive = setInterval(() => {
        if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
          console.log("deepgram: keepalive");
          deepgram.keepAlive();
        }
      }, 10 * 1000);

      deepgram.addListener(LiveTranscriptionEvents.Open, () => {
        console.log("🔗 deepgram: connected");
        readyToSendAudio = true;

        // שלח את כל ה-chunks שהצטברו
        while (pendingChunks.length > 0) {
          const chunk = pendingChunks.shift();
          lastChunkTime = Date.now();
          deepgram.send(chunk);
        }
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
        const tier = data?.tier || "unknown";
        const models = data?.models || "-";
        console.log(`deepgram: metadata received – Detected language: ${detectedLang}, Tier: ${tier}, Models: ${models}`);
        ws.send(JSON.stringify({ metadata: data }));
      });

      deepgram.addListener(LiveTranscriptionEvents.Close, () => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive);
        readyToSendAudio = false;

        // ניסיון חיבור מחדש אחרי שנייה
        setTimeout(() => {
          console.log("🔄 Reconnecting to Deepgram...");
          createDeepgramConnection();
        }, 1000);
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.log("⚠️ deepgram: error received");
        console.error(error);
      });

      deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
        console.log("⚠️ deepgram: warning received");
        console.warn(warning);
      });
    }

    // יצירת חיבור ל-Deepgram בתחילה
    createDeepgramConnection();

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);

      if (!readyToSendAudio) {
        console.log("⚠️ Not ready to send audio yet, queuing chunk");
        pendingChunks.push(message);
        return;
      }

      if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
        lastChunkTime = Date.now();
        deepgram.send(message);
      } else if (deepgram.getReadyState && deepgram.getReadyState() >= 2) {
        console.log("⚠️ deepgram connection closing/closed, queuing chunk and reconnecting...");
        pendingChunks.push(message);
        createDeepgramConnection();
      } else {
        console.log("⚠️ deepgram connection not open, queuing chunk");
        pendingChunks.push(message);
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
      clearInterval(keepAlive);
      deepgram?.finish();
      deepgram?.removeAllListeners();
      deepgram = null;
      pendingChunks = [];
      readyToSendAudio = false;
    });
  });
}

module.exports = startWebSocketServer;
