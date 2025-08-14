const { WebSocketServer } = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { spawn } = require('child_process'); // הוספנו FFmpeg

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("⚠️ Missing DEEPGRAM_API_KEY in environment variables");
}

const deepgramClient = createClient(deepgramApiKey);

let keepAlive;

function convertWebmOpusToPCM16kHz() {
  return spawn('ffmpeg', [
    '-loglevel', 'quiet',
    '-i', 'pipe:0',
    '-acodec', 'pcm_s16le',
    '-ac', '1',
    '-ar', '16000',
    '-f', 'wav',
    'pipe:1'
  ]);
}

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  let detectedLanguage = null; // לשמור את השפה שזוהתה

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");

    let deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'en-US',
      punctuate: true,
      interim_results: true,
      endpointing: 500,
      vad_events: true,  
      encoding: 'linear16',
      sample_rate: 16000
    });

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
        console.log("deepgram: keepalive");
        deepgram.keepAlive();
      }
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, () => {
      console.log("🔗 deepgram: connected");
    });

    deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
      const latency = lastChunkTime ? (Date.now() - lastChunkTime) : null;
      console.log("✅ WebSocket received transcript from deepgram", latency ? `Latency: ${latency} ms` : '');
      console.log("✅ WebSocket sent transcript to client");
      ws.send(JSON.stringify(data));
    });

    deepgram.addListener(LiveTranscriptionEvents.Close, () => {
      console.log("deepgram: disconnected");
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.log("⚠️ deepgram: error received");
      console.error(error);
    });

    deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
      console.log("⚠️ deepgram: warning received");
      console.warn(warning);
    });

    // Metadata
    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
      const detectedLang = data?.detected_language || "unknown";
      console.log(`deepgram: metadata received – Detected language: ${detectedLang}`);
      ws.send(JSON.stringify({ metadata: data }));
    });

    // משתנה לזמני שליחה
    let lastChunkTime = null;

    // 🎙️ Handle incoming audio chunks
    ws.on('message', (chunk) => {
      console.log('Received audio chunk, size:', chunk.length);

      // המרת WebM/Opus ל-PCM16kHz
      const ffmpeg = convertWebmOpusToPCM16kHz();
      ffmpeg.stdin.write(chunk);
      ffmpeg.stdin.end();

      ffmpeg.stdout.on('data', (pcmChunk) => {
        if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
          lastChunkTime = Date.now();
          deepgram.send(pcmChunk);
        }
      });

      ffmpeg.on('close', () => {
        console.log("✅ Audio successfully converted to PCM 16kHz");
        ws.send(JSON.stringify({ conversion: "success", encoding: "linear16", sample_rate: 16000 }));
      });

      ffmpeg.stderr.on('data', (err) => {
        console.error("FFmpeg error:", err.toString());
      });
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
      clearInterval(keepAlive);
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = null;
    });
  });
}

module.exports = startWebSocketServer;
