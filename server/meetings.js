const express = require("express");
const router = express.Router();
const { supabase } = require("../client/src/utils/supabaseClient");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// פונקציה ליצירת מזהה פגישה בן 20 ספרות
function generateMeetingId() {
  let id = "";
  while (id.length < 20) {
    id += Math.floor(Math.random() * 10); // ספרה אקראית
  }
  return id;
}

// פונקציה ליצירת סיסמה אקראית באורך 8
function generateMeetingPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

// פונקציה ליצירת URL אקראי לפגישה (שימוש בקיים)
function generateMeetingUrl() {
  const randomString = crypto.randomBytes(8).toString("hex"); // 16 תווים אקראיים
  const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
  return `${BASE_URL}/Call?sessionId=${randomString}`;
}

// =======================================
// יצירת פגישה חדשה (לא שינינו כאן את הלוגיקה הקיימת)
// =======================================
router.post("/create", async (req, res) => {
  try {
    const { host_user_id } = req.body;

    if (!host_user_id) {
      return res.status(400).json({ error: "host_user_id is required" });
    }

    const meeting_id = generateMeetingId();
    const meeting_password = generateMeetingPassword();
    const url_meeting = generateMeetingUrl();
    const qr_data = url_meeting;
    const created_at = new Date().toISOString();
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // שעה קדימה
    const is_active = true;

    const { data, error } = await supabase.from("Meetings").insert([
      {
        host_user_id,
        meeting_password,
        created_at,
        is_active,
        meeting_id,
        url_meeting,
        qr_data,
        expiry
      }
    ]).select();

    if (error) {
      console.error("Error creating meeting:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ meeting: data[0] });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =======================================
// START ROUTE - בקרות לפני התחלת שיחה + יצירת JWT + החזרת URL דינמי
// =======================================
router.post("/start", async (req, res) => {
  try {
    const { user_id, meeting_id } = req.body;

    if (!user_id || !meeting_id) {
      return res.status(400).json({ error: "user_id and meeting_id are required" });
    }

    // 1) בדיקה שה־user קיים בטבלת Users
    // בדיקת JWT שהלקוח שלח
const token = req.headers.authorization?.split(" ")[1];
if (!token) {
  return res.status(401).json({ error: "Missing authorization token" });
}

const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
if (userErr || !user) {
  return res.status(401).json({ error: "Invalid or expired token" });
}

    if (userErr) {
      console.error("Supabase error (Users):", userErr);
      return res.status(500).json({ error: "Database error checking user" });
    }
    if (!userRow) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2) בדיקה על user_preferences שיש ערכים חוקיים
    const { data: prefs, error: prefsErr } = await supabase
      .from("user_preferences")
      .select("native_language,gender,display_name")
      .eq("user_id", user_id)
      .maybeSingle();

    if (prefsErr) {
      console.error("Supabase error (user_preferences):", prefsErr);
      return res.status(500).json({ error: "Database error checking user preferences" });
    }
    if (!prefs) {
      return res.status(400).json({ error: "User preferences not found" });
    }

    const requiredFields = ["native_language", "gender", "display_name"];
    for (const f of requiredFields) {
      if (!prefs[f] || String(prefs[f]).trim() === "") {
        return res.status(400).json({ error: `User preference '${f}' is missing or empty` });
      }
    }

    // 3) בדיקה שיש רשומת פגישה עבור meeting_id
    const { data: meetingRow, error: meetingErr } = await supabase
      .from("Meetings")
      .select("*")
      .eq("meeting_id", meeting_id)
      .maybeSingle();

    if (meetingErr) {
      console.error("Supabase error (Meetings):", meetingErr);
      return res.status(500).json({ error: "Database error checking meeting" });
    }
    if (!meetingRow) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // 3.1) בדיקה שה־host_user_id תואם ל־user_id של המקליק
    if (meetingRow.host_user_id !== user_id) {
      return res.status(403).json({ error: "User is not the host of this meeting" });
    }

    // 4) בדיקה ש־is_active = true
    if (!meetingRow.is_active) {
      return res.status(400).json({ error: "Meeting is not active" });
    }

    // === כל הבדיקות עברו - יוצרים JWT ===
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not configured in environment");
      return res.status(500).json({ error: "Server JWT configuration error" });
    }

    // payload (הנתונים שציינת)
    const payload = {
      user_id,
      display_name: prefs.display_name,
      native_language: prefs.native_language,
      gender: prefs.gender,
      meeting_id: meetingRow.meeting_id,
      meeting_password: meetingRow.meeting_password
    };

    // ייחודיות ל־JWT
    const jti = (typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");

    // חתימה
    const token = jwt.sign(
      { ...payload, jti },
      process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: "8h" } // ניתן לשנות את התוקף לפי צורך
    );

    // כתובת למסך השיחה (CALL): ברירת מחדל - הכתובת שבה ה־call.html מתארח
    const CALL_BASE_URL = process.env.CALL_BASE_URL || "https://speech-app-server.onrender.com/call.html";
    const redirectUrl = `${CALL_BASE_URL}?userToken=${encodeURIComponent(token)}`;

    return res.status(200).json({ url: redirectUrl });
  } catch (err) {
    console.error("Server error in /start:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// =======================================
// הצטרפות לפגישה קיימת (לא שינינו כאן)
// =======================================
router.post("/join", async (req, res) => {
  try {
    const { meeting_id, user_id } = req.body;

    if (!meeting_id || !user_id) {
      return res.status(400).json({ error: "meeting_id and user_id are required" });
    }

    const { data: existing } = await supabase
      .from("Participants")
      .select()
      .eq("meeting_id", meeting_id)
      .eq("user_id", user_id)
      .single();

    if (existing) {
      return res.status(200).json({ participant: existing, message: "Already joined" });
    }

    const { data, error } = await supabase.from("Participants").insert([
      {
        meeting_id,
        user_id,
        joined_at: new Date().toISOString()
      }
    ]).select();

    if (error) {
      console.error("Error joining meeting:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ participant: data[0] });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
