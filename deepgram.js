const { WebSocketServer } = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}

const deepgramClient = createClient(deepgramApiKey);

let keepAlive;

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");

    let deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'multi',
      punctuate: true,
      interim_results: true,
      endpointing: 500,
      vad_events: true
    });

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      console.log("deepgram: keepalive");
      deepgram.keepAlive();
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, () => {
      console.log("deepgram: connected");
    });

    deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
      console.log("deepgram: transcript received");
      // שולח ל־client רק את הטקסט מהתמלול
      const transcript = data.channel.alternatives[0]?.transcript || '';
      const isFinal = data.is_final || false;
      ws.send(JSON.stringify({ transcript, isFinal }));
      console.log(`📢 Transcript${isFinal ? ' (final)' : ' (interim)'}: ${transcript}`);
    });

    deepgram.addListener(LiveTranscriptionEvents.Close, () => {
      console.log("deepgram: disconnected");
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.log("deepgram: error received");
      console.error(error);
      ws.close();
    });

    deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
      console.log("deepgram: warning received");
      console.warn(warning);
    });

    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("deepgram: metadata received");
      ws.send(JSON.stringify({ metadata: data }));
    });

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);
      if (deepgram.getReadyState() === WebSocket.OPEN) {
        deepgram.send(message);
      } else if (deepgram.getReadyState() >= 2) {
        console.log("deepgram connection closing/closed, reconnecting...");
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = deepgramClient.listen.live({
          model: 'nova-3',
          smart_format: true,
          language: 'multi',
          punctuate: true,
          interim_results: true,
          endpointing: 500,
          vad_events: true
        });
      } else {
        console.log("deepgram connection not open, can't send data");
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      clearInterval(keepAlive);
      deepgram.finish();
      deepgram.removeAllListeners();
    });
  });
}

module.exports = startWebSocketServer;
