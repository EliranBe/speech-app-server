const WebSocket = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const express = require('express'); // אם צריך app

module.exports = function startWebSocketServer(server, app) {
  const wss = new WebSocket.Server({ server }); // server מגיע מ-index.js

  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    throw new Error("⚠️ Missing DEEPGRAM_API_KEY in environment variables");
  }

  const deepgramClient = createClient(deepgramApiKey);
  let keepAlive;

  const setupDeepgram = (ws) => {
    const deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'en-US',
      punctuate: true,
      interim_results: true,
      endpointing: 100,
      vad_events: true,
      channels: 1
    });

    let lastChunkTime = null;

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
         console.log("deepgram: keepalive");
        deepgram.keepAlive();
        },10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async() => {
      console.log("🔗 deepgram: connected");

      deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        const latency = lastChunkTime ? (Date.now() - lastChunkTime) : null;
        console.log("📦 Full transcript event:", JSON.stringify(data, null, 2));
        console.log("✅ WebSocket received transcript from deepgram", latency ? `Latency: ${latency} ms` : '');
        console.log("✅ WebSocket sent transcript to client");
        ws.send(JSON.stringify(data));
      });

      deepgram.addListener(LiveTranscriptionEvents.Close, async() => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive);
        deepgram.finish();
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, async(error) => {
        console.log("⚠️ deepgram: error received");
        console.error(error);
      });

      deepgram.addListener(LiveTranscriptionEvents.Warning, async(warning) => {
        console.log("⚠️ deepgram: warning received");
        console.warn(warning);
      });

      deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
        const detectedLang = data?.detected_language || "unknown";
        const tier = data?.tier || "unknown";
        const models = data?.models || "-";
        console.log(`deepgram: metadata received – Detected language: ${detectedLang}, Tier: ${tier}, Models: ${models}`);
        ws.send(JSON.stringify({ metadata: data }));
      });
    });

    return deepgram;
  };

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");
    let deepgram = setupDeepgram(ws);
    let lastChunkTime = null;

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);

      if (deepgram.getReadyState() === 1) { // OPEN
        lastChunkTime = Date.now();
        console.log("✅ WebSocket sent data to deepgram");
        deepgram.send(message);
      } else if (deepgram.getReadyState() >= 2) { // CLOSING / CLOSED
        console.log("⚠️ WebSocket couldn't be sent data to deepgram");
        console.log("⚠️ WebSocket retrying connection to deepgram");
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = setupDeepgram(ws);
      } else {
        console.log("⚠️ WebSocket couldn't be sent data to deepgram");
      }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = null;
    });
  });
};
