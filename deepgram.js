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

  const setupDeepgram = (ws, getLastChunkTime) => {
    const deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'en-US',
      dictation: true, 
      punctuate: true,
      utterances: true,
      diarize: true,
      numerals: true,
      paragraphs: true,
      interim_results: true,
      utterance_end_ms: 1000,  //When using utterance_end_ms, setting interim_results=true is also required.//
      endpointing: 100,
      vad_events: true
    });

    let keepAlive = setInterval(() => {
    console.log("deepgram: keepalive");
    deepgram.keepAlive();
  }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async() => {
      console.log("🔗 deepgram: connected");

      deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
         if (!data.is_final) return;
         const lastChunkTime = getLastChunkTime();
        const latency = lastChunkTime ? (Date.now() - lastChunkTime) : null;
       console.log(
        `📦 Full final transcript event${latency ? ` (Latency: ${latency} ms)` : ''}:`,
        JSON.stringify(data, null, 2)
      );
        console.log("✅ WebSocket received transcript from deepgram");
        console.log("✅ WebSocket sent transcript to client");
          // שמירה לממוצע
        if (latency && ws.latencies) {
          ws.latencies.push(latency);
        }
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

    return { deepgram, keepAlive };
  };

  wss.on('connection', (ws) => {
    console.log("🔗 Client connected to WebSocket");
    let lastChunkTime = null;
    const getLastChunkTime = () => lastChunkTime;
    let { deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime);

    ws.on('message', (message) => {
      console.log('Received audio chunk, size:', message.length);
  // מנסה לפרש את ההודעה כ-JSON
  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch (e) {
    parsed = null;
  }

  // אם מדובר באירוע מיקרופון
  if (parsed && parsed.event) {
    if (parsed.event === "MIC_OPEN") {
      console.log("🎙️ Microphone opened (server)");
      // אתחל מערך לאיסוף Latency אם צריך
      ws.latencies = [];
      ws.micOpenTime = Date.now();
      return;
    }
    if (parsed.event === "MIC_CLOSE") {
      console.log("🛑 Microphone closed (server)");
      // חשב ממוצע Latency שנאסף
      if (ws.latencies && ws.latencies.length > 0) {
        const avgLatency = ws.latencies.reduce((a,b)=>a+b,0) / ws.latencies.length;
        console.log(`🕒 Average STT Latency for this session: ${avgLatency.toFixed(2)} ms`);
      } else {
        console.log("🕒 No latency data collected for this session.");
      }
      ws.latencies = [];
      ws.micOpenTime = null;
      return;
    }
  }

  // אחרת מדובר בנתוני אודיו
  if (deepgram.getReadyState() === 1) { // OPEN
    lastChunkTime = Date.now();
    console.log("✅ WebSocket sent data to deepgram");
    deepgram.send(message);
  } else if (deepgram.getReadyState() >= 2) { // CLOSING / CLOSED
    console.log("⚠️ WebSocket couldn't be sent data to deepgram");
    console.log("⚠️ WebSocket retrying connection to deepgram");
    deepgram.finish();
    deepgram.removeAllListeners();
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }
    ({ deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime));
  } else {
    console.log("⚠️ WebSocket couldn't be sent data to deepgram");
  }
    });

    ws.on('close', () => {
      console.log("❌ Client disconnected from WebSocket");
    if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = null;
         });
  });
};
