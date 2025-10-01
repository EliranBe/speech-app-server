const express = require("express");
const router = express.Router();
const { supabase } = require("../client/src/utils/supabaseClient");
const crypto = require("crypto");

async function createMeetingToken(payload) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET); // מפתח סימטרי
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

// פונקציה ליצירת מזהה פגישה בן 20 ספרות
function generateMeetingId() {
  let id = "";
  while (id.length < 20) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
}

// פונקציה ליצירת סיסמה אקראית באורך 8
function generateMeetingPassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

// פונקציה ליצירת URL אקראי לפגישה
function generateMeetingUrl() {
  const randomString = crypto.randomBytes(8).toString("hex");
  const BASE_URL = process.env.BASE_URL ||  "http://Verbo.io";
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
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // שעה קדימה
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
// בקרות לפני התחלת שיחה + יצירת JWT + החזרת URL דינמי
// =======================================
router.post("/start", async (req, res) => {
  try {
    const { meeting_id } = req.body;

    if (!meeting_id ) {
      return res
        .status(400)
        .json({ error: "meeting_id is required" });
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const accessToken = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = await verifyAccessToken(accessToken);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    const user_id = decoded.id;

    console.log("JWT verified:", decoded);
    
   await supabase.auth.setAuth(accessToken);

    const { data: prefs, error: prefsErr } = await supabase
      .from("user_preferences")
      .select("native_language,gender,display_name")
      .maybeSingle();

    if (prefsErr) {
      console.error("Supabase error (user_preferences):", prefsErr);
      return res
        .status(500)
        .json({ error: "Database error checking user preferences" });
    }
    if (!prefs) {
      return res.status(400).json({ error: "User preferences not found" });
    }

    const requiredFields = ["native_language", "gender", "display_name"];
    for (const f of requiredFields) {
      if (!prefs[f] || String(prefs[f]).trim() === "") {
        return res
          .status(400)
          .json({ error: `User preference '${f}' is missing or empty` });
      }
    }

    const { data: meetingRow, error: meetingErr } = await supabase
      .from("Meetings")
      .select("*")
      .eq("meeting_id", meeting_id)
      .maybeSingle();

    if (meetingErr) {
      console.error("Supabase error (Meetings):", meetingErr);
      return res
        .status(500)
        .json({ error: "Database error checking meeting" });
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

    const payload = {
      user_id,
      display_name: prefs.display_name,
      native_language: prefs.native_language,
      gender: prefs.gender,
      meeting_id: meetingRow.meeting_id,
      meeting_password: meetingRow.meeting_password,
    };

    const jti =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString("hex");

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
// הצטרפות לפגישה קיימת
// =======================================
router.post("/join", async (req, res) => {
  try {
    const { meeting_id, user_id } = req.body;

    if (!meeting_id || !user_id) {
      return res
        .status(400)
        .json({ error: "meeting_id and user_id are required" });
    }

    const { data: existing, error: existingErr } = await supabase
      .from("Participants")
      .select()
      .eq("meeting_id", meeting_id)
      .eq("user_id", user_id)
      .single();

    if (existingErr) {
      console.error("Supabase error checking participant:", existingErr);
      return res
        .status(500)
        .json({ error: "Database error checking participant" });
    }

    if (existing) {
      return res
        .status(200)
        .json({ participant: existing, message: "Already joined" });
    }

    const { data, error } = await supabase
      .from("Participants")
      .insert([
        {
          meeting_id,
          user_id,
          joined_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Error joining meeting:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ participant: data[0] });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
