const WebSocket = require('ws'); 
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const express = require('express');
const { translateText, mapNativeLanguageToAzure } = require('./azure-translator'); // ✅ ייבוא פונקציה
const { synthesizeTextToBase64 } = require('./google-tts');
const { jwtVerify } = require("jose");

module.exports = function startWebSocketServer(server, app) {
  const wss = new WebSocket.Server({ server });

  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    throw new Error("⚠️ Missing DEEPGRAM_API_KEY in environment variables");
  }

  const deepgramClient = createClient(deepgramApiKey);

  function mapNativeLanguageToDeepgram(nativeLanguage) {
    const map = {
      "Australia (English)": "en-AU",
      "Belgium (Dutch)": "nl",
      "Brazil (Portuguese)": "pt-BR",
      "Denmark (Danish)": "da-DK",
      "France (French)": "fr",
      "Germany (German)": "de",
      "India (English)": "en-IN",
      "Indonesia (Indonesian)": "id",
      "Italy (Italian)": "it",
      "Japan (Japanese)": "multi",
      "Netherlands (Dutch)": "nl",
      "Norway (Norwegian)": "no",
      "Portugal (Portuguese)": "pt-PT",
      "Russia (Russian)": "multi",
      "Spain (Spanish)": "es",
      "Sweden (Swedish)": "sv-SE",
      "Turkey (Turkish)": "tr",
      "UK (English)": "en-GB",
      "USA (English)": "en-US",
      "USA (Spanish)": "es"
    };
    return map[nativeLanguage];
  }

  function getOtherUsersNativeLanguages(currentWs) {
    const langs = [];
    wss.clients.forEach(client => {
      if (client !== currentWs && client.native_language) {
        langs.push(client.native_language);
      }
    });
    return langs;
  }

  function getTargetLang(otherUsersLangs) {
return otherUsersLangs.length > 0
    ? mapNativeLanguageToAzure(otherUsersLangs[0])
    : null;
  }

function getSonioxConfig(ws) {
  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) throw new Error("Missing SONIOX_API_KEY");
  return {
    api_key: apiKey,
    model: "stt-rt-preview",
    language_hints: ["he"],
    enable_language_identification: true,
    enable_speaker_diarization: true,
    enable_endpoint_detection: true,
    audio_format: "auto",
    translation: {
      type: "two_way",
      language_a: "he",
      language_b: getOtherUsersNativeLanguages(ws)
    }
  };
}

function setupSoniox(ws, getLastChunkTime) {
  const SONIOX_WS_URL = process.env.SONIOX_WS_URL;
  const soniox = new WebSocket(SONIOX_WS_URL);
  const config = getSonioxConfig(ws);

  let keepAlive = setInterval(() => {
    if (soniox.readyState === WebSocket.OPEN) {
      soniox.send(JSON.stringify({ type: "ping" }));
    }
  }, 10000);

  soniox.on("open", () => {
    soniox.send(JSON.stringify(config));
    console.log("🔗 Soniox connected for Hebrew STT + Translate");
  });

  soniox.on("message", async (msg) => {
        let data;
    try {
      data = JSON.parse(msg.toString());
    } catch (err) {
      console.warn("⚠️ Non-JSON message from Soniox:", msg.toString());
      return;
    }
    
    // ⚠️ טיפול בשגיאות
    if (data.error_code) {
      console.error(`❌ Soniox error: ${data.error_code} - ${data.error_message}`);
      soniox.close();
      return;
    }

    if (data.finished) {
      console.log("✅ Soniox session finished");
      soniox.close();
      return;
    }

    if (!Array.isArray(data.tokens)) return;

    const finalTokens = [];
    const nonFinalTokens = [];
    for (const token of data.tokens) {
      if (!token || !token.text) continue;
      if (token.is_final) finalTokens.push(token);
      else nonFinalTokens.push(token);
    }
    
  // טוקנים מקוריים
  const transcriptText = finalTokens
      .filter(t => t.translation_status !== "translation")
      .map(t => t.text)
      .join(" ");

  // טוקנים מתורגמים
  const translatedText = finalTokens
      .filter(t => t.translation_status === "translation")
      .map(t => t.text)
      .join(" ");

    if (transcriptText && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "transcript", payload: transcriptText }));

      // שליחה לאחרים
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.clientId !== ws.clientId) {
          client.send(JSON.stringify({
            type: "translation",
            payload: { original: transcriptText, translated: translatedText }
          }));
        }
      });

      // TTS
      try {
        const audioBase64 = await synthesizeTextToBase64(translatedText || transcriptText, {
          native_language: ws.native_language,
          gender: ws.gender
        });
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client.clientId !== ws.clientId) {
            client.send(JSON.stringify({
              type: "tts",
              payload: { audioBase64 }
            }));
          }
        });
      } catch (err) {
        console.error("❌ Google TTS error", err);
      }
    }
  });

  soniox.on("close", () => {
    clearInterval(keepAlive);
    console.log("❌ Soniox WS closed");
  });

  soniox.on("error", (err) => console.error("❌ Soniox WS error:", err));

  return { soniox, keepAlive };
}




  const setupDeepgram = (ws, getLastChunkTime) => {
    const deepgram = deepgramClient.listen.live({
      model: 'nova-3',
      smart_format: true,
      language: 'multi',
      dictation: true,
      punctuate: true,
      utterances: true,
      diarize: true,
      numerals: true,
      paragraphs: true,
      interim_results: false,
      endpointing: 100,
      vad_events: true
    });

    let keepAlive = setInterval(() => {
      console.log("deepgram: keepalive");
      deepgram.keepAlive();
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
      console.log("🔗 deepgram: connected");

      deepgram.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
        const last = typeof getLastChunkTime === 'function' ? getLastChunkTime() : null;
        const latency = last ? (Date.now() - last) : null;
        console.log("📦 Full transcript event:", JSON.stringify(data, null, 2));
        console.log("✅ WebSocket received transcript from deepgram", latency ? `Latency: ${latency} ms` : '');
        console.log("✅ WebSocket sent transcript to client");

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }

        const transcriptText = data?.channel?.alternatives?.[0]?.transcript;
        let translated = null;

       if (transcriptText) {
    try {
        translated = await translateText(transcriptText, ws.native_language, getOtherUsersNativeLanguages(ws));
        const targetLang = getTargetLang(getOtherUsersNativeLanguages(ws));
        console.log("🌍 Translated text:", translated);
        if (translated && typeof translated === "object") {
            const translatedText = translated[targetLang] || "";
            ws.translationCharCount += translatedText.length;
          console.log(`🔢 Translation char count for ${ws.display_name}: ${ws.translationCharCount}`);
        }

            // שליחת התרגום ללקוחות האחרים
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN && client.clientId !== ws.clientId) {
                client.send(JSON.stringify({
                  type: "translation",
                  payload: { original: transcriptText, translated }
                }));
              }
            });

            // TTS
            if (translated) {
              try {
                const textForTTS = translated?.[targetLang] || "";
const audioBase64 = await synthesizeTextToBase64(textForTTS, {
  native_language: ws.native_language,
  gender: ws.gender
});

                wss.clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN && client.clientId !== ws.clientId) {
                    client.send(JSON.stringify({
                      type: "tts",
                      payload: { audioBase64 }
                    }));
                  }
                });
              } catch (err) {
                console.error("❌ Google TTS error");
              }
            }
          } catch (err) {
            console.error("❌ Translation error");
          }
        }
      });

      deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive);
      });

      deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
        console.log("⚠️ deepgram: error received");
        console.error(error);
      });

      deepgram.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
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

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      console.error("❌ Missing token, closing WS");
      ws.close();
      return;
    }

    try {
      const { payload: decoded } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );

      ws.user_id = decoded.user_id;
      ws.display_name = decoded.display_name;
      ws.native_language = decoded.native_language;
      ws.gender = decoded.gender;
      ws.meeting_id = decoded.meeting_id;

      console.log("👤 Connected user:", {
        user_id: ws.user_id,
        display_name: ws.display_name,
        native_language: ws.native_language,
        gender: ws.gender,
        meeting_id: ws.meeting_id,
      });

    } catch (err) {
      console.error("❌ JWT verification failed");
      ws.close();
      return;
    }

      // ✅ בדיקה אם meeting_id פעיל לפני שממשיכים
  const axios = require("axios");
  try {
    const res = await axios.get(`https://speech-app-server.onrender.com/api/meetings/checkValidity?meeting_id=${ws.meeting_id}`);
    if (!res.data.valid) {
      console.error(`❌ Meeting ${ws.meeting_id} is not active, closing WS`);
      ws.close();
      return;
    }
  } catch (err) {
    console.error("❌ Error checking meeting validity");
    ws.close();
    return;
  }

    ws.clientId = url.searchParams.get("user_id") || decoded.user_id;
    console.log("🔗 Client connected:", ws.clientId);
    ws.translationCharCount = 0; // ספירה מצטברת של תווים לתרגום עבור המשתמש בפגישה הזו

    let lastChunkTime = null;
    const getLastChunkTime = () => lastChunkTime;
    let deepgram = null;
    let keepAlive = null;
    let sonioxSocket = null;
    
    if (ws.native_language === "Hebrew" || ws.native_language === "Israel (Hebrew)" || ws.native_language === "he") {
      console.log("🟦 Using Soniox for Hebrew STT & Translate");
      sonioxSocket = setupSoniox(ws, getLastChunkTime);
    } else {
      ({ deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime));
    }


ws.on('message', (message) => {
  if (ws.readyState !== WebSocket.OPEN) return;
  if (ws.native_language === "Hebrew" || ws.native_language === "עברית" || ws.native_language === "he") {
    // --- Soniox ---
    if (sonioxSocket?.soniox?.readyState === WebSocket.OPEN) {
      sonioxSocket.soniox.send(message);
    } else {
      console.log("⚠️ Soniox socket not ready, skipping message");
    }

  } else {
    // --- Deepgram ---
    if (deepgram.getReadyState() === 1) {
      lastChunkTime = Date.now();
      deepgram.send(message);
    } else if (deepgram.getReadyState() >= 2) {
      console.log("⚠️ WebSocket couldn't send data to Deepgram. Reconnecting...");
      deepgram.finish();
      deepgram.removeAllListeners();
      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }
      ({ deepgram, keepAlive } = setupDeepgram(ws, getLastChunkTime));
    } else {
      console.log("⚠️ Deepgram socket not ready");
    }
  }
});


ws.on('close', () => {
  console.log("❌ Client disconnected from WebSocket");

  if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }

  // עדכון ספירת התווים אם נשלחו תרגומים
  if (ws.translationCharCount > 0) {
    const axios = require("axios");
    axios.post("https://speech-app-server.onrender.com/api/meetings/updateTranslationCount", {
      meeting_id: ws.meeting_id,
      translation_char_count: ws.translationCharCount
    })
    .then(() => console.log(`✅ Sent translation count for meeting ${ws.meeting_id}: ${ws.translationCharCount}`))
    .catch(err => console.error("❌ Error sending translation count"));
  }

  // ✅ בדיקה אם אין עוד משתתפים בפגישה
  const otherClientsInMeeting = Array.from(wss.clients)
    .filter(c => c.readyState === WebSocket.OPEN && c.meeting_id === ws.meeting_id);

  if (otherClientsInMeeting.length === 0) {
    console.log(`📌 Last participant left meeting ${ws.meeting_id}, setting finished_at`);

    const axios = require("axios");
    axios.post("https://speech-app-server.onrender.com/api/meetings/finishMeeting", {
      meeting_id: ws.meeting_id,
      finished_at: new Date().toISOString()
    })
    .then(() => console.log(`✅ Meeting ${ws.meeting_id} finished_at updated`))
    .catch(err => console.error("❌ Error updating finished_at"));
  }

  // ✅ סגירת חיבורי STT לפי השפה
  if (ws.native_language === "Hebrew" || ws.native_language === "עברית" || ws.native_language === "he") {
 if (sonioxSocket) {
    // ❗ סגירת keepAlive אם קיים
    if (sonioxSocket.keepAlive) {
      clearInterval(sonioxSocket.keepAlive);
      sonioxSocket.keepAlive = null;
    }

    try {
      sonioxSocket.soniox.close();
      console.log("🟦 Soniox socket closed cleanly");
    } catch (err) {
      console.error("⚠️ Error closing Soniox socket", err);
    }
   sonioxSocket = null; 
  }
  } else {
    if (deepgram) {
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = null;
    }
  }
});

  });
};
