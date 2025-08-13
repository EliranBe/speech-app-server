// deepgram.js
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

    let deepgram = null;
    let dgOpen = false;
    let keepAliveTimer = null;

    // נאגר כאן אודיו אם ה־DG לא פתוח כרגע
    const pendingAudio = [];

    // חשוב להתאים לפורמט שמגיע מהדפדפן (MediaRecorder: audio/webm;codecs=opus @48kHz)
    const DG_OPTIONS = {
      model: 'nova-3',
      language: 'en-US',
      smart_format: true,
      punctuate: true,
      interim_results: true,
      endpointing: 500,
      vad_events: true,
      encoding: 'webm',   // ✅ קריטי ל-webm/opus
      sample_rate: 48000, // ✅ MediaRecorder בדרך כלל 48kHz
      channels: 1
    };

    const openDeepgram = () => {
      deepgram = deepgramClient.listen.live(DG_OPTIONS);

      deepgram.addListener(LiveTranscriptionEvents.Open, () => {
        dgOpen = true;

        // מרוקנים את התור שנאגר
        while (pendingAudio.length) {
          deepgram.send(pendingAudio.shift());
        }

        // keepAlive עדין כל 25 שניות וללא ספאם לוגים
        clearInterval(keepAliveTimer);
        keepAliveTimer = setInterval(() => {
          if (deepgram && deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN) {
            deepgram.keepAlive();
          }
        }, 25_000);

        console.log("deepgram: connected");
      });

      deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        // שולחים ללקוח – כולל interim/final
        ws.send(JSON.stringify(data));
      });

      deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
        // שמיש לדיבוג בצד לקוח אם תרצה
        ws.send(JSON.stringify({ metadata: data }));
      });

      deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
        console.warn("deepgram: warning", warning);
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.error("deepgram: error", error);
        // לא סוגרים את ws של הלקוח; נאפשר ריקונקט בשליחת אודיו הבא
        dgOpen = false;
      });

      deepgram.addListener(LiveTranscriptionEvents.Close, () => {
        console.log("deepgram: disconnected");
        dgOpen = false;
        clearInterval(keepAliveTimer);
        // לא סוגרים את ws ללקוח. נפתח מחדש כשיגיע אודיו (ראה ws.on('message'))
      });
    };

    // פתיחת חיבור ראשוני ל-DG
    openDeepgram();

    ws.on('message', (message) => {
      // message מגיע כ-ArrayBuffer (webm/opus)
      if (!deepgram) {
        openDeepgram();
      }

      if (deepgram.getReadyState && deepgram.getReadyState() === WebSocket.OPEN && dgOpen) {
        deepgram.send(message);
      } else {
        // נאגר עד שהחיבור ייפתח מחדש
        pendingAudio.push(message);

        // אם החיבור היה CLOSED/CLOSING – נפתח מחדש
        if (deepgram.getReadyState && deepgram.getReadyState() >= 2) {
          console.log("deepgram: reconnecting...");
          try {
            deepgram.removeAllListeners();
            deepgram.finish();
          } catch (_) {}
          openDeepgram();
        }
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      clearInterval(keepAliveTimer);
      try {
        if (deepgram) {
          deepgram.removeAllListeners();
          deepgram.finish();
        }
      } catch (_) {}
      deepgram = null;
      dgOpen = false;
    });
  });
}

module.exports = startWebSocketServer;
