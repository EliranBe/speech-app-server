const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const http = require('http');
const server = http.createServer(app);

const port = process.env.PORT || 3000;

if (!process.env.DEEPGRAM_API_KEY) {
  throw new Error('Missing DEEPGRAM_API_KEY in environment variables');
}

app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('🎉 Server is running!');
});

const startWebSocketServer = require('./deepgram');
startWebSocketServer(server);

server.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
