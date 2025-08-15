const { WebSocketServer } = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const fs = require('fs');
const { spawn } = require('child_process');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("⚠️ Missing DEEPGRAM_API_KEY in environment variables");
}

const deepgramClient = createClient(deepgramApiKey);

function probeFileWithFfprobe(path) {
  const child = spawn('ffprobe', [
    '-v', 'error',
    '-show_streams',
    '-of', 'json',
    path
  ]);

  let out = '';
  let err = '';

  child.stdout.on('data', d => out += d.toString());
  child.stderr.on('data', d => err += d.toString());

  child.on('close', (code) => {
    if (code === 0 && out) {
      try {
        const info = JSON.parse(out);
        const audio = (info.streams || []).find(s => s.codec_type === 'audio');
        if (audio) {
          console.log(`🔎 Probe: codec=${audio.codec_name}, sample_rate=${audio.sample_rate}, channels=${audio.channels}`);
          if (audio.codec_name === 'opus') {
            console.log('ℹ️ Probe result: Looks like WebM/Opus from the browser (likely 48000 Hz).');
          } else if (audio.codec_name === 'pcm_s16le') {
            console.log('ℹ️ Probe result: Looks like linear16 PCM (likely 16000 Hz).');
          } else {
            console.log('ℹ️ Probe result: Audio codec is', audio.codec_name);
          }
        } else {
          console.warn('⚠️ Probe: no audio stream found in first chunk.');
        }
      } catch (e) {
        console.error('❌ Failed to parse ffprobe JSON output:', e, out || err);
      }
    } else {
      console.warn('⚠️ ffprobe exited with code', code, 'stderr:', err);
      // Fallback: נסה ffmpeg -i (מדפיס ל-stderr תיאור)
      const ffm = spawn('ffmpeg', ['-i', path]);
      let stderr = '';
      ffm.stderr.on('data', d => stderr += d.toString());
      ffm.on('close', () => {
        console.log('🔎 ffmpeg probe output:\n', stderr);
      });
    }
  });

  child.on('error', (e) => {
    if (e.code === 'ENOENT') {
      console.warn('⚠️ ffprobe not found on this server. Install ffmpeg/ffprobe or use an image that includes it.');
    } else {
      console.error('❌ ffprobe error:', e);
    }
  });
}

let keepAlive;

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  let detectedLanguage = null; // לשמור את השפה שזוהתה

  let firstChunkSaved = false;
const FIRST_CHUNK_PATH = '/tmp/first_chunk.webm';

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
      // אל תסגור את ה-ws כאן - תן ללוגיקה ב-ws.on('message') לנסות reconnect
    });

    deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
      console.log("⚠️ deepgram: warning received");
      console.warn(warning);
    });

      // 📌 Metadata: מידע על השפה והחיבור
    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
    const detectedLang = data?.detected_language || "unknown";
    console.log(`deepgram: metadata received – Detected language: ${detectedLang}`);
      ws.send(JSON.stringify({ metadata: data }));
    });

    
   // נוסיף משתנה שיחזיק זמני שליחה
let lastChunkTime = null;

ws.on('message', (message) => {
  console.log('Received audio chunk, size:', message.length);

   if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
    lastChunkTime = Date.now(); // שמירת הזמן שבו שלחנו
    deepgram.send(message);
  } else if (deepgram.getReadyState && deepgram.getReadyState() >= 2) {
    console.log("⚠️ deepgram connection closing/closed, reconnecting...");
    deepgram.finish();
    deepgram.removeAllListeners();
    deepgram = deepgramClient.listen.live({
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
  } else {
    console.log("⚠️ deepgram connection not open, can't send data");
  }
 });
    
    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
      clearInterval(keepAlive);
      deepgram.finish();
      deepgram.removeAllListeners();
       deepgram = null; // חשוב לאפס את המשתנה אחרי סגירה
    });
  });
}

module.exports = startWebSocketServer;
