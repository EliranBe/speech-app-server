const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public')); // מאפשר גישה ל-call.html ולשאר קבצים בתיקיית public

// ✅ החזרת APP_ID בצורה בטוחה
app.get('/appId', (req, res) => {
  res.json({ appId: process.env.APP_ID });
});

// ✅ הפקת Token מאובטח לפי בקשה מהדפדפן
app.get('/rte-token', (req, res) => {
  const channelName = req.query.channelName;
  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required' });
  }

  const uid = 0;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    process.env.APP_ID,
    process.env.APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );

  res.json({ rtcToken: token });
});

// 🛠️ נקודת בדיקה
app.get('/', (req, res) => {
  res.send('🎉 השרת פועל בהצלחה!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

