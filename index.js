const path = require('path');
const express = require('express');
const http = require('http');
const dotenv = require("dotenv");
dotenv.config();
const { supabase } = require('./client/src/utils/supabaseClient');
const cors = require('cors');
const meetingsRouter = require("./server/meetings");
 
// בדיקה ש־Google TTS מוגדר
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  throw new Error("⚠️ Missing GOOGLE_APPLICATION_CREDENTIALS_JSON in environment variables");
}

// בדיקה ש־Azure Translator מוגדר
if (!process.env.AZURE_TRANSLATOR_RESOURCE_ID) {
  throw new Error("⚠️ Missing AZURE_TRANSLATOR_RESOURCE_ID in environment variables");
}
if (!process.env.AZURE_TRANSLATOR_REGION) {
  throw new Error("⚠️ Missing AZURE_TRANSLATOR_REGION in environment variables");
}
if (!process.env.AZURE_TRANSLATOR_ENDPOINT) {
  throw new Error("⚠️ Missing AZURE_TRANSLATOR_ENDPOINT in environment variables");
}
if (!process.env.AZURE_TRANSLATOR_KEY1) {
  throw new Error("⚠️ Missing AZURE_TRANSLATOR_KEY1 in environment variables");
}

const app = express();
const server = http.createServer(app); // נדרש בשביל WebSocket

const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const port = process.env.PORT || 3000;

// בדיקה ש־API Key של Deepgram קיים
if (!process.env.DEEPGRAM_API_KEY) {
  throw new Error("⚠️ Warning: Missing DEEPGRAM_API_KEY in environment variables");
}
if (!process.env.DEEPGRAM_PROJECT_ID) {
  console.warn("⚠️ Warning: Missing DEEPGRAM_PROJECT_ID – not critical but might be used later.");
}

app.use(cors());
app.use(express.static('public')); // מאפשר גישה לקבצי HTML כמו stt-test.html
// Serve React build
app.use(express.static(path.join(__dirname, 'client/build')));

//כל בקשה ל־/api/session תנותב לפי הקובץ sessionRoutes.js.//
const sessionRoutes = require('./routes/sessionRoutes'); // CommonJS
app.use('/api', sessionRoutes);

//כל בקשה ל־/api/session תנותב לפי הקובץ userPreferencesRoutes.js.//
const userPreferencesRoutes = require("./routes/userPreferencesRoutes");
app.use("/api", userPreferencesRoutes);

app.use("/api/meetings", meetingsRouter);

// כל route שלא מוגדר ב-API יוגש על ידי React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

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

// חיבור WebSocket לשרת HTTP
const startWebSocketServer = require('./deepgram');
startWebSocketServer(server, app);

// הפעלת השרת
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
