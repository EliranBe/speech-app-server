const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public')); // עבור call.html

// ✅ הוספת API להחזרת APP_ID בצורה בטוחה
app.get('/appId', (req, res) => {
  res.json({ appId: process.env.APP_ID });
});

// 🛠️ נקודת בדיקה
app.get('/', (req, res) => {
  res.send('🎉 השרת פועל בהצלחה!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
