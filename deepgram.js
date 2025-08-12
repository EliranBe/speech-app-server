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
      language: 'en-US',
      punctuate: true,
      interim_results: true,
      endpointing: 500,
      vad_events: true
    });

    if (keepAlive) clearInterval(keepAlive);
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
  console.log("ws: transcript sent to client");
  ws.send(JSON.stringify(data));
});

    deepgram.addListener(LiveTranscriptionEvents.Close, () => {
      console.log("deepgram: disconnected");
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.log("deepgram: error received");
      console.error(error);
      // אל תסגור את ה-ws כאן - תן ללוגיקה ב-ws.on('message') לנסות reconnect
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
      if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
        deepgram.send(message);
      } else if (deepgram.getReadyState && deepgram.getReadyState() >= 2) {
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
      deepgram = null; // חשוב לאפס את המשתנה אחרי סגירה
    });
  });
}

module.exports = startWebSocketServer;

קוד index.js:
const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const http = require('http');
const server = http.createServer(app); // נדרש בשביל WebSocket

const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const port = process.env.PORT || 3000;

// בדיקה ש־API Key של Deepgram קיים
if (!process.env.DEEPGRAM_API_KEY) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}
if (!process.env.DEEPGRAM_PROJECT_ID) {
  console.warn("⚠️ Warning: Missing DEEPGRAM_PROJECT_ID – not critical but might be used later.");
}

app.use(cors());
app.use(express.static('public')); // מאפשר גישה לקבצי HTML כמו stt-test.html

// החזרת APP_ID בצורה בטוחה
app.get('/appId', (req, res) => {
  res.json({ appId: process.env.AGORA_APP_ID });
});

// הפקת Token מאובטח לפי בקשה מהדפדפן
app.get('/rte-token', (req, res) => {
  const channelName = req.query.channelName;
  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required' });
  }

  try {
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      process.env.AGORA_APP_ID,
      process.env.AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    res.json({ rtcToken: token });
  } catch (err) {
    console.error('Failed to generate token:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// נקודת כניסה בסיסית לשרת
app.get('/', (req, res) => {
  res.send('🎉 השרת פועל בהצלחה!');
});

// חיבור WebSocket לשרת HTTP
const startWebSocketServer = require('./deepgram');
startWebSocketServer(server);

// הפעלת השרת
server.listen(port, () => {
  console.log(🚀 Server is running on port ${port});
});
