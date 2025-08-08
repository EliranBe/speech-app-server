const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// ✅ הגנה על משתני סביבה
if (!process.env.APP_ID) {
  throw new Error("Missing APP_ID in environment variables");
}

app.use(cors());
app.use(express.static('public')); // שירת הקבצים לדוגמת call.html

// ✅ נקודת API שמחזירה את APP_ID
app.get('/appId', (req, res) => {
  res.json({ appId: process.env.APP_ID });
});

// 🛠️ נקודת בדיקה
app.get('/', (req, res) => {
  res.send('🎉 השרת פועל בהצלחה!');
});

// ✅ ייבוא והפעלת WebSocket של Deepgram
const startWebSocketServer = require('./deepgram');
startWebSocketServer(server);

// 🔊 הפעלת שרת HTTP עם WebSocket
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
