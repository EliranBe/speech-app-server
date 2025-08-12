const { WebSocketServer } = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}

const deepgramClient = createClient(deepgramApiKey);

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");

    let deepgram;
    let keepAlive;

    const connectDeepgram = () => {
      if (keepAlive) clearInterval(keepAlive);

      deepgram = deepgramClient.listen.live({
        model: 'nova-3',
        smart_format: true,
        language: 'en-US',
        punctuate: true,
        interim_results: true,
        endpointing: 0, // כדי לא לנתק בסוף משפט
        vad_events: true
      });

      keepAlive = setInterval(() => {
        if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
          console.log("deepgram: keepalive");
          deepgram.keepAlive();
        }
      }, 10 * 1000);

      deepgram.addListener(LiveTranscriptionEvents.Open, () => {
        console.log("deepgram: connected");
      });

      deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        console.log("deepgram: transcript received");
        ws.send(JSON.stringify(data));
      });

      deepgram.addListener(LiveTranscriptionEvents.Close, () => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive);
        console.log("deepgram: reconnecting...");
        connectDeepgram(); // מייד פותח חיבור חדש
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.error("deepgram: error received", error);
      });

      deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
        console.warn("deepgram: warning received", warning);
      });

      deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
        console.log("deepgram: metadata received");
        ws.send(JSON.stringify({ metadata: data }));
      });
    };

    // הפעלה ראשונה של החיבור
    connectDeepgram();

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);
      if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
        deepgram.send(message);
      } else {
        console.log("deepgram connection not open, reconnecting before sending...");
        connectDeepgram();
        // שליחה מחדש של החבילה אחרי חיבור
        setTimeout(() => {
          if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
            deepgram.send(message);
          }
        }, 500);
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      clearInterval(keepAlive);
      if (deepgram) {
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = null;
      }
    });
  });
}

module.exports = startWebSocketServer;
