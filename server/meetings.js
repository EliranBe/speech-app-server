  const express = require("express");
  const router = express.Router();
  const { supabase } = require("../client/src/utils/supabaseClient");
  const crypto = require("crypto");
  const { SignJWT } = require("jose");
  
  async function createMeetingToken(payload) {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);
  }
  
  async function verifyAccessToken(accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) {
      console.error("JWT verification failed:", error);
      throw new Error("Invalid or expired access token");
    }
    return data.user;
  }
  
  async function validateUserAndPreferences(accessToken) {
    const user = await verifyAccessToken(accessToken);
    if (!user) {
      throw new Error("Unauthorized: user not found");
    }
  
    const { data: prefs, error: prefsErr } = await supabase
      .from("user_preferences")
      .select("native_language,gender,display_name")
      .eq("user_id", user.id)
      .maybeSingle();
  
    if (prefsErr || !prefs) {
      throw new Error("Missing user preferences");
    }
  
    const requiredFields = ["native_language", "gender", "display_name"];
    for (const f of requiredFields) {
      if (!prefs[f] || String(prefs[f]).trim() === "") {
        throw new Error(`User preference '${f}' is missing or empty`);
      }
    }
  
    return { user, prefs };
  }
  
  function generateMeetingId() {
    let id = "";
    while (id.length < 20) {
      id += Math.floor(Math.random() * 10);
    }
    return id;
  }
  
  function generateMeetingPassword() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }
  
  function generateMeetingUrl() {
    const randomString = crypto.randomBytes(8).toString("hex");
    const BASE_URL = process.env.BASE_URL || "http://Verbo.io";
    return `${BASE_URL}/Call?sessionId=${randomString}`;
  }
  
  // =======================================
  // יצירת פגישה חדשה
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
      const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const is_active = true;
  
      const { data, error } = await supabase
        .from("Meetings")
        .insert([
          {
            host_user_id,
            meeting_password,
            created_at,
            is_active,
            meeting_id,
            url_meeting,
            qr_data,
            expiry,
          },
        ])
        .select();
  
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
  // START ROUTE
  // =======================================
  router.post("/start", async (req, res) => {
    try {
      const { meeting_id } = req.body;
if (!meeting_id && !url_meeting) {
  return res.status(400).json({ error: "Please enter a Meeting ID and Password or URL" });
}

  
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ error: "Missing or invalid Authorization header" });
      }
      const accessToken = authHeader.split(" ")[1];
  
      let user, prefs;
      try {
        ({ user, prefs } = await validateUserAndPreferences(accessToken));
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }
      const user_id = user.id;
  
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
  
      if (meetingRow.host_user_id !== user_id) {
        return res
          .status(403)
          .json({ error: "User is not the host of this meeting" });
      }
  
      if (!meetingRow.is_active) {
        return res.status(400).json({ error: "Meeting is not active" });
      }
  
      const jti =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");
  
  const payload = {
    user_id,
    display_name: prefs.display_name,
    native_language: prefs.native_language,
    gender: prefs.gender,
    meeting_id: meetingRow.meeting_id,
    meeting_password: meetingRow.meeting_password,
    jti
  };
  
      const meetingToken = await createMeetingToken(payload);
  
      const CALL_BASE_URL =
        process.env.CALL_BASE_URL ||
        "https://speech-app-server.onrender.com/call.html";
  
      const redirectUrl = `${CALL_BASE_URL}?userToken=${encodeURIComponent(
        meetingToken
      )}`;
  
      return res.status(200).json({ url: redirectUrl });
    } catch (err) {
      console.error("Server error in /start:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });
  
  // =======================================
  // JOIN ROUTE — כולל כל 6 הבדיקות
  // =======================================
router.post("/join", async (req, res) => {
  try {
    const { meeting_id, meeting_password, url_meeting } = req.body;

    // 1. בדיקת קלט — כמו שקיים כיום
    if (!meeting_id && !url_meeting) {
      return res
        .status(400)
        .json({ error: "Please enter a Meeting ID and Password or a Meeting URL" });
    }

    // 2. אימות Session / בדיקת User Preferences — לא לשנות
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const accessToken = authHeader.split(" ")[1];
    let user, prefs;
    try {
      ({ user, prefs } = await validateUserAndPreferences(accessToken));
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }
    const user_id = user.id;

    // 3. בדיקת הפגישה בטבלת Meetings
        const { data: meetingRow, error: meetingErr } = await supabase
      .from("Meetings")
      .select("*")
      .eq("meeting_id", meeting_id)
      .maybeSingle();
        
    if (meetingErr || !meetingRow) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // בדיקת credentials: URL או meeting_id+meeting_password
    const urlMatch = url_meeting && meetingRow.url_meeting === url_meeting;
    const passwordMatch =
      meeting_id && meeting_password &&
      meetingRow.meeting_id === meeting_id &&
      meetingRow.meeting_password === meeting_password;

    if (!(urlMatch || passwordMatch)) {
      return res.status(403).json({ error: "Invalid meeting credentials" });
    }

    let participantRow = null;
    let newParticipant = null;

    // 4. בדיקת HOST
    if (meetingRow.host_user_id === user_id) {
      // HOST — דילוג על בדיקת Participants → הולך ישר לבדיקה 6
    } else {
      
// 5. בדיקת משתתף נוסף (Participants)
const checkMeetingId = meetingRow.meeting_id; // תמיד משתמשים ב־meeting_id מהבדיקה 3

// נבדוק אם יש רשומת משתתף קיימת עבור הפגישה
const { data: participantData, error: participantErr } = await supabase
  .from("Participants")
  .select("*")
  .eq("meeting_id", checkMeetingId)
  .maybeSingle();

if (participantErr) {
  console.error("Supabase error checking participant:", participantErr);
  return res.status(500).json({ error: "Database error checking participant" });
}

participantRow = participantData;

if (participantRow) {
  if (participantRow.user_id === null) {
    // 🟢 הרשומה קיימת אבל עדיין לא שויך אליה משתמש → נעדכן אותה
    const { data: updatedParticipant, error: updateErr } = await supabase
      .from("Participants")
      .update({
        user_id,
        joined_at: new Date().toISOString(),
      })
      .eq("meeting_id", checkMeetingId)
      .select()
      .single();

    if (updateErr) {
      console.error("Error updating participant:", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    participantRow = updatedParticipant;
  } else if (participantRow.user_id !== user_id) {
    // 🟥 יש כבר משתמש אחר באותה פגישה
    return res.status(403).json({ error: "User not authorized to join this meeting" });
  }
} else {
  // 🟥 אם אין בכלל רשומת משתתף — מדובר בטעות לוגית
  console.error("Participant record missing for meeting:", checkMeetingId);
  return res
    .status(500)
    .json({ error: "Participant record not found for this meeting" });
}
    }

    // 6. בדיקת is_active — מבוצעת תמיד אחרי HOST/Participants
    if (!meetingRow.is_active) {
      return res.status(400).json({ error: "Meeting is not active" });
    }

    // 8. יצירת JWT Token לפגישה — לא לשנות
    const jti =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString("hex");

    const payload = {
      user_id,
      display_name: prefs.display_name,
      native_language: prefs.native_language,
      gender: prefs.gender,
      meeting_id: meetingRow.meeting_id,
      meeting_password: meetingRow.meeting_password,
      jti,
    };

    const meetingToken = await createMeetingToken(payload);

    // 9. בניית URL להמשך — כמו ב-/start
    const CALL_BASE_URL =
      process.env.CALL_BASE_URL ||
      "https://speech-app-server.onrender.com/call.html";

    const redirectUrl = `${CALL_BASE_URL}?userToken=${encodeURIComponent(meetingToken)}`;

    return res.status(200).json({
      participant: participantRow || newParticipant || null,
      url: redirectUrl,
    });
  } catch (err) {
    console.error("Server error in /join:", err);
    return res.status(500).json({ error: "Server error" });
  }
});
  
  module.exports = router;
