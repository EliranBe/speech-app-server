function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws) => {
    console.log("🔗 Client connected to WebSocket");

    const audioEncoding = 'opus';
    const sampleRate = 48000;

    let deepgramLive;
    let keepAliveInterval;
    let clientDisconnected = false;  // מצב שמראה אם הלקוח התנתק

    try {
      const options = {
        model: 'nova-3',
        language: 'multi',
        punctuate: true,
        interim_results: true,
        endpointing: 500,
        vad_events: true
      };

      deepgramLive = await deepgram.listen.live(options);
    } catch (err) {
      console.error("❌ Failed to connect to Deepgram:", err);
      ws.close();
      return;
    }

    deepgramLive.on(LiveTranscriptionEvents.Open, () => {
      console.log(`🔵 Deepgram connection opened (${audioEncoding}, ${sampleRate}Hz)`);

      keepAliveInterval = setInterval(() => {
        if (deepgramLive.getReadyState() === WebSocket.OPEN) {
          deepgramLive.send(JSON.stringify({ type: "KeepAlive" }));
          console.log("⏸️ Sent KeepAlive message to Deepgram");
        }
      }, 3000);

      deepgramLive.on(LiveTranscriptionEvents.Close, () => {
        clearInterval(keepAliveInterval);
        console.log("🔴 Deepgram connection closed, stopped KeepAlive");
      });

      deepgramLive.on(LiveTranscriptionEvents.Error, (err) => {
        clearInterval(keepAliveInterval);
        console.error("Deepgram connection error:", err);
      });
    });

    deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
      try {
        const transcript = data.channel.alternatives[0]?.transcript;
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
      // אם הלקוח התנתק, לא שולחים עוד
      if (clientDisconnected) return;

      console.log('Received audio chunk, size:', message.length);
      if (deepgramLive && deepgramLive.getReadyState() === WebSocket.OPEN) {
        deepgramLive.send(message);
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected");
      clientDisconnected = true;

      if (deepgramLive && deepgramLive.getReadyState() === WebSocket.OPEN) {
        deepgramLive.finish();
      }
    });
  });
}
