const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const http = require('http');
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

// נקודת כניסה בסיסית לשרת
app.get('/', (req, res) => {
  res.send('🎉 השרת פועל בהצלחה!');
});

// חיבור WebSocket לשרת HTTP
const startWebSocketServer = require('./deepgram');
startWebSocketServer(server);

// הפעלת השרת
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
