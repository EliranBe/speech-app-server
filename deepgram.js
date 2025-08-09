const { WebSocketServer } = require('ws');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("Missing DEEPGRAM_API_KEY in environment variables");
}

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");

    const audioEncoding = process.env.AUDIO_ENCODING || 'linear16';
    const sampleRate = parseInt(process.env.SAMPLE_RATE || (audioEncoding === 'opus' ? 48000 : 16000), 10);

    const wsUrl = `wss://api.deepgram.com/v1/listen?access_token=${deepgramApiKey}&encoding=${audioEncoding}&sample_rate=${sampleRate}`;

    const deepgramSocket = new (require('ws'))(wsUrl);

    deepgramSocket.on('open', () => {
      console.log(`🔵 Deepgram connection opened (${audioEncoding}, ${sampleRate}Hz)`);
    });

    deepgramSocket.on('close', () => {
      console.log("🔴 Deepgram connection closed");
      ws.close();
    });

    deepgramSocket.on('error', (error) => {
      console.error("Deepgram Error:", error);
      ws.close();
    });

    deepgramSocket.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final || false;
        if (transcript) {
          ws.send(JSON.stringify({ transcript, isFinal }));
          console.log(`📢 Transcript${isFinal ? ' (final)' : ' (interim)'}: ${transcript}`);
        }
      } catch (err) {
        console.error("⚠️ Error parsing Deepgram transcript:", err);
      }
    });

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);
      if (deepgramSocket.readyState === deepgramSocket.OPEN) {
        deepgramSocket.send(message);
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      deepgramSocket.close();
    });
  });
}

module.exports = startWebSocketServer;
