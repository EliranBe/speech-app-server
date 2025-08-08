const { WebSocketServer } = require('ws');
const { createClient } = require('@deepgram/sdk');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

if (!deepgramApiKey) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}

// ✅ יצירת לקוח חדש לפי גרסה 3
const deepgram = createClient(deepgramApiKey);

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws) => {
    console.log("🔗 Client connected to WebSocket");

    // ✅ יצירת סטרים חדש עם פרמטרים
    const deepgramLive = await deepgram.listen.live({
      model: 'nova-3',
      language: 'en', // אין תמיכה בעברית - נתמכות: en, es, fr, etc.
      punctuate: true,
      interim_results: false,
    });

    // ⏺️ קבלת תוצאות מ־Deepgram ושליחה ללקוח
    deepgramLive.on('transcriptReceived', (data) => {
      const transcript = data.channel.alternatives[0]?.transcript;
      if (transcript) {
        ws.send(JSON.stringify({ transcript }));
      }
    });

    // ⏹️ אם Deepgram חווה בעיה
    deepgramLive.on('error', (error) => {
      console.error("Deepgram Error:", error);
      ws.close();
    });

    // ⛔ סיום סטרים כשנסגר WebSocket
    ws.on('close', () => {
      console.log("❌ Client disconnected");
      deepgramLive.finish();
    });

    // 🎙️ שליחת אודיו מהלקוח ל־Deepgram
    ws.on('message', (message) => {
      deepgramLive.send(message);
    });
  });
}

module.exports = startWebSocketServer;
