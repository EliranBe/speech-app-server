const { WebSocketServer } = require('ws');
const { Deepgram } = require('@deepgram/sdk');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

if (!deepgramApiKey) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}

const deepgram = new Deepgram(deepgramApiKey);

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");

    // יצירת חיבור ל־Deepgram דרך WebSocket
    const deepgramSocket = deepgram.transcription.live({
      punctuate: true,
      interim_results: false,
      language: 'he' // ניתן לשנות בהתאם לשפה הרצויה
    });

    // קבלת תוצאות מ־Deepgram והדפסה לקונסול
    deepgramSocket.on('transcriptReceived', (data) => {
      const result = JSON.parse(data);
      const transcript = result.channel?.alternatives[0]?.transcript;
      if (transcript) {
        console.log("🗣️ Deepgram STT:", transcript);
        // לא נשלח ללקוח כרגע
      }
    });

    // קבלת אודיו מהלקוח ושליחתו ל־Deepgram
    ws.on('message', (message) => {
      if (deepgramSocket.getReadyState() === 1) {
        deepgramSocket.send(message);
      }
    });

    // ניקוי כשנסגר
    ws.on('close', () => {
      console.log("❌ Client disconnected");
      deepgramSocket.finish();
    });
  });
}

module.exports = startWebSocketServer;
