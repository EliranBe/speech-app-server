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
app.use(express.json());

// Serve React build
app.use(express.static(path.join(__dirname, 'client/build')));
app.use(express.static(path.join(__dirname, 'public')));

//כל בקשה ל־/api/session תנותב לפי הקובץ sessionRoutes.js.//
const sessionRoutes = require('./routes/sessionRoutes'); // CommonJS
app.use('/api', sessionRoutes);

//כל בקשה ל־/api/session תנותב לפי הקובץ userPreferencesRoutes.js.//
const userPreferencesRoutes = require("./routes/userPreferencesRoutes");
app.use("/api", userPreferencesRoutes);

app.use("/api/meetings", meetingsRouter);

app.post('/updateTranslationCount', async (req, res) => {
    const { meeting_id, translation_char_count } = req.body;

    console.log("Updating translation count:", meeting_id, translation_char_count);

    try {
        // 1. הבאת הערך הקיים ב־Meetings
        const { data: meetingData, error: fetchMeetingError } = await supabase
            .from('Meetings')
            .select('translation_char_count, started_at')
            .eq('meeting_id', meeting_id)
            .single();

        if (fetchMeetingError) throw fetchMeetingError;

        const oldValue = meetingData.translation_char_count ? parseInt(meetingData.translation_char_count) : 0;
        const newValue = parseInt(translation_char_count) || 0;
        const delta = newValue - oldValue; // הפרש

        const startedAt = meetingData.started_at;
        const month_year = startedAt.substring(0, 7); // YYYY-MM

        // 2. עדכון הערך ב־Meetings
        const { error: meetingError } = await supabase
            .from('Meetings')
            .update({ translation_char_count: newValue })
            .eq('meeting_id', meeting_id);

        if (meetingError) throw meetingError;

        // 3. בדיקה אם רשומה לחודש כבר קיימת
        const { data: monthlyData, error: monthlyError } = await supabase
            .from('MonthlyTotalTranslationCounts')
            .select('total_translation_char_count')
            .eq('month_year', month_year)
            .single();

        if (monthlyError && monthlyError.code !== 'PGRST116') { // לא קיים
            throw monthlyError;
        }

        if (monthlyData) {
            // עדכון הצטברתי קיים — מוסיפים רק את ההפרש
            const { error: updateError } = await supabase
                .from('MonthlyTotalTranslationCounts')
                .update({
                    total_translation_char_count: parseInt(monthlyData.total_translation_char_count) + delta
                })
                .eq('month_year', month_year);

            if (updateError) throw updateError;
        } else {
            // יצירת רשומה חדשה
            const { error: insertError } = await supabase
                .from('MonthlyTotalTranslationCounts')
                .insert([{ month_year, total_translation_char_count: newValue }]);

            if (insertError) throw insertError;
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
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

app.get("/call-session/Call", (req, res) => {
  if (req.query.sessionId) {
    return res.redirect("/login");
  }
  res.status(404).send("Not Found");
});

// כל route שלא מוגדר ב-API יוגש על ידי React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// חיבור WebSocket לשרת HTTP
const startWebSocketServer = require('./deepgram');
startWebSocketServer(server, app);

// הפעלת השרת
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
