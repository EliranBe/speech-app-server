// deepgram.js
const { WebSocketServer } = require('ws');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error('Missing DEEPGRAM_API_KEY in environment variables');
}

function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (wsClient) => {
    console.log('🔗 Client connected');

    // התחברות ישירה ל-Deepgram עם פרמטרים ל-interim results ועוד
    const deepgramSocket = new (require('ws'))(
      'wss://api.deepgram.com/v1/listen?language=en&interim_results=true&punctuate=true&encoding=linear16&sample_rate=16000',
      {
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
        },
      }
    );

    deepgramSocket.on('open', () => {
      console.log('✅ Connected to Deepgram');

      deepgramSocket.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          console.log('📥 Deepgram message:', JSON.stringify(msg, null, 2));

          if (wsClient.readyState === wsClient.OPEN) {
            wsClient.send(data);
          }
        } catch (e) {
          console.error('❌ Error parsing Deepgram message:', e);
        }
      });

      deepgramSocket.on('error', (e) => {
        console.error('❌ Deepgram WS error:', e);
        wsClient.close();
      });

      deepgramSocket.on('close', () => {
        console.log('🔌 Deepgram WS closed');
        wsClient.close();
      });
    });

    deepgramSocket.on('error', (e) => {
      console.error('❌ Failed to connect Deepgram WS:', e);
      wsClient.close();
    });

    wsClient.on('message', (msg) => {
      if (deepgramSocket.readyState === deepgramSocket.OPEN) {
        deepgramSocket.send(msg);
      } else {
        console.warn('⚠️ Deepgram socket not open, cannot send audio');
      }
    });

    wsClient.on('close', () => {
      console.log('❌ Client disconnected');
      if (deepgramSocket.readyState === deepgramSocket.OPEN) {
        deepgramSocket.close();
      }
    });

    wsClient.on('error', (e) => {
      console.error('❌ Client WS error:', e);
      try {
        wsClient.close();
      } catch {}
    });
  });
}

module.exports = startWebSocketServer;
