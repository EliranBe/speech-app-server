// token-server.js
const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/generate-token', (req, res) => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  const channelName = req.query.channel;
  const uid = req.query.uid || 0;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 90; // טוקן לאגורה תקף לדקה וחצי

  if (!channelName) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );

  return res.json({ token });
});

app.listen(port, () => {
  console.log(`Agora Token Server running on port ${port}`);
});
