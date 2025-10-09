  const express = require("express");
  const router = express.Router();
  const { supabase } = require("../client/src/utils/supabaseClient");
  const crypto = require("crypto");
  const { SignJWT, jwtVerify } = require("jose");

// Middleware לבדיקה אם המשתמש מחובר פחות מ־24 שעות
async function checkLastSignIn(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const accessToken = authHeader.split(" ")[1];

    // קבלת פרטי המשתמש מ‑Supabase
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    const user = data.user;

    // בדיקת last_sign_in_at
    const lastSignIn = new Date(user.last_sign_in_at);
    const now = new Date();

    const hoursSinceSignIn = (now - lastSignIn) / (1000 * 60 * 60 );
    if (hoursSinceSignIn > 12) {
      return res.status(401).json({ error: "Session expired — please log in again" });
    }

    req.user = user; // שומר את המשתמש בבקשה להמשך שימוש
    next();
  } catch (err) {
    console.error("checkLastSignIn error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

  router.use(checkLastSignIn);

function isUserAllowed(user_id) {
  const allowedList = process.env.ALLOWED_USER_IDS
    ? process.env.ALLOWED_USER_IDS.split(",").map(id => id.trim())
    : null; // null = אין רשימת גישה מוגדרת

  const blockedList = process.env.BLOCKED_USER_IDS
    ? process.env.BLOCKED_USER_IDS.split(",").map(id => id.trim())
    : [];

  // אם רשימת גישה קיימת — רק משתמשים בה נמצאים בה יורשו
  if (allowedList && allowedList.length > 0) {
    return allowedList.includes(user_id);
  }

  // אם אין רשימת גישה — כולם מורשים למעט אלו שב‐BLOCKED
  return !blockedList.includes(user_id);
}

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

async function setStartedAtIfNull(meeting_id) {
  const { data, error } = await supabase
    .from("Meetings")
    .select("started_at")
    .eq("meeting_id", meeting_id)
    .single();

  if (!error && data && !data.started_at) {
    await supabase
      .from("Meetings")
      .update({ started_at: new Date().toISOString() })
      .eq("meeting_id", meeting_id);
  }
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
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ meeting: data[0] });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // =======================================
  // START ROUTE
  // =======================================
  router.post("/start", async (req, res) => {
        let user_id;
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
                user_id = user.id;
          if (!isUserAllowed(user_id)) {
            return res.status(403).json({ error: "User is not allowed to use this service" });
          }
      } catch (err) {
        return res.status(401).json({ error: err.message });
      }
      
      const { data: meetingRow, error: meetingErr } = await supabase
        .from("Meetings")
        .select("*")
        .eq("meeting_id", meeting_id)
        .maybeSingle();

      if (meetingErr) {
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

      // עדכון שדה started_at לפגישה
      await setStartedAtIfNull(meeting_id);

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
        "";

      const redirectUrl = `${CALL_BASE_URL}?userToken=${encodeURIComponent(
        meetingToken
      )}`;

      return res.status(200).json({ url: redirectUrl });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  });

  // =======================================
  // JOIN ROUTE — כולל כל 6 הבדיקות
  // =======================================
router.post("/join", async (req, res) => {
      let user_id;
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
            user_id = user.id;
        if (!isUserAllowed(user_id)) {
            return res.status(403).json({ error: "User is not allowed to use this service" });
          }
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    // 3. בדיקת הפגישה בטבלת Meetings

let meeting_id_to_use = meeting_id; // ברירת מחדל

// אם יש meeting_id, נבדוק אותו תחילה
let { data: meetingRow, error: meetingErr } = await supabase
  .from("Meetings")
  .select("*")
  .eq("meeting_id", meeting_id)
  .maybeSingle();


// אם לא מצאנו meetingRow ויש url_meeting, נחפש לפי URL
if ((!meetingRow || !meetingRow.meeting_id) && url_meeting) {
  const { data: meetingByUrl, error: urlErr } = await supabase
    .from("Meetings")
    .select("meeting_id")
    .eq("url_meeting", url_meeting)
    .maybeSingle();

  if (urlErr || !meetingByUrl) {
    return res.status(404).json({ error: "Meeting not found by URL" });
  }

  meeting_id_to_use = meetingByUrl.meeting_id;

  // נחזור לבדוק שוב לפי meeting_id החדש
  ({ data: meetingRow, error: meetingErr } = await supabase
    .from("Meetings")
    .select("*")
    .eq("meeting_id", meeting_id_to_use)
    .maybeSingle());

  if (meetingErr || !meetingRow) {
    return res.status(404).json({ error: "Meeting not found" });
  }
}

    // בדיקת credentials: URL או meeting_id+meeting_password
    const urlMatch = url_meeting && meetingRow.url_meeting === url_meeting;
    const passwordMatch =
      meeting_id && meeting_password &&
      meetingRow.meeting_id === meeting_id_to_use &&
      meetingRow.meeting_password === meeting_password;

    if (!(urlMatch || passwordMatch)) {
      return res.status(403).json({ error: "Invalid meeting credentials" });
    }

    let participantRow = null;
    let newParticipant = null;

    
    // 6. בדיקת is_active — מבוצעת תמיד אחרי HOST/Participants
    if (!meetingRow.is_active) {
      return res.status(400).json({ error: "Meeting is not active" });
    }

    // 4. בדיקת HOST
    if (meetingRow.host_user_id === user_id) {
      // HOST — דילוג על בדיקת Participants → הולך ישר לבדיקה 6
    } else {

// 5. בדיקת משתתף נוסף (Participants)
const checkMeetingId = meeting_id_to_use; // עכשיו משתמשים ב־meeting_id שנמצא
   
// נבדוק אם יש רשומת משתתף קיימת עבור הפגישה
const { data: participantData, error: participantErr } = await supabase
  .from("Participants")
  .select("*")
  .eq("meeting_id", checkMeetingId)
  .maybeSingle();

if (participantErr) {
  return res.status(500).json({ error: "Database error checking participant" });
}

let participantRow = participantData;
      
if (participantRow) {
  if (participantRow.user_id === null) {
        // ===== בדיקה נוספת לפני עדכון Participants =====
    const { data: hostPrefs, error: hostPrefsErr } = await supabase
      .from("user_preferences")
      .select("native_language")
      .eq("user_id", meetingRow.host_user_id)
      .single();

    if (hostPrefsErr || !hostPrefs) {
      return res.status(500).json({
        error: "Unable to verify host's native language — server error"
      });
    }

    const userNativeLanguage = prefs.native_language?.trim().toLowerCase();
    const hostNativeLanguage = hostPrefs.native_language?.trim().toLowerCase();

    if (userNativeLanguage && hostNativeLanguage && userNativeLanguage === hostNativeLanguage) {
      return res.status(403).json({
        error: "Joining not allowed — your native language is the same as the host's native language."
      });
    }
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
      return res.status(500).json({ error: updateErr.message });
    }

    participantRow = updatedParticipant;
  } else if (participantRow.user_id !== user_id) {
    // 🟥 יש כבר משתמש אחר באותה פגישה
    return res.status(403).json({ error: "User not authorized to join this meeting" });
  }
} else {
  // 🟥 אם אין בכלל רשומת משתתף — מדובר בטעות לוגית
  return res
    .status(500)
    .json({ error: "Participant record not found for this meeting" });
}
    }

    // עדכון שדה started_at לפגישה
      await setStartedAtIfNull(meeting_id_to_use);
    
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
      "";

    const redirectUrl = `${CALL_BASE_URL}?userToken=${encodeURIComponent(meetingToken)}`;

    return res.status(200).json({
      participant: participantRow || newParticipant || null,
      url: redirectUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ עדכון מספר התווים בסוף כל פגישה
async function updateTranslationCount(meeting_id, translation_char_count) {
  const { data: meeting, error: meetingError } = await supabase
    .from("Meetings")
    .select("started_at, translation_char_count")
    .eq("meeting_id", meeting_id)
    .single();

  if (meetingError || !meeting) throw new Error("Meeting not found");

  const startedAt = new Date(meeting.started_at);
  const month_year = `${startedAt.getFullYear()}-${String(startedAt.getMonth() + 1).padStart(2, "0")}`;

  const oldValue = parseInt(meeting.translation_char_count) || 0;
  const newValue = oldValue + parseInt(translation_char_count);

  const { error: updateError } = await supabase
    .from("Meetings")
    .update({ translation_char_count: newValue })
    .eq("meeting_id", meeting_id);

  if (updateError) throw updateError;

  const { data: existingMonth, error: existingError } = await supabase
    .from("MonthlyTotalTranslationCounts")
    .select("total_translation_char_count")
    .eq("month_year", month_year)
    .single();

  if (existingError && !existingMonth) {
    await supabase
      .from("MonthlyTotalTranslationCounts")
      .insert([{ month_year, total_translation_char_count: parseInt(translation_char_count) }]);
  } else {
    const oldMonthValue = parseInt(existingMonth?.total_translation_char_count) || 0;
    const newMonthValue = oldMonthValue + parseInt(translation_char_count);

    await supabase
      .from("MonthlyTotalTranslationCounts")
      .update({ total_translation_char_count: newMonthValue })
      .eq("month_year", month_year);
  }
}

router.post("/participantTranslationCount", async (req, res) => {
  try {
    const { meeting_id, user_id, char_count, leave_at } = req.body;

    if (!meeting_id || !user_id || char_count == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ❗ קריאת ה־JWT מתוך ה־Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = authHeader.split(" ")[1]; // מסיר את "Bearer "

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // אימות ה־JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const decodedUserId = payload.user_id;
    const decodedMeetingId = payload.meeting_id;

    // בדיקת התאמה בין הנתונים ב־token לנתוני הבקשה
    if (decodedUserId !== user_id || decodedMeetingId !== meeting_id) {
      return res.status(401).json({ error: "Token does not match user or meeting" });
    }

    // הוספת רשומה חדשה למסד
    const { error: insertError } = await supabase
      .from("ParticipantTranslationCounts")
      .insert([
        {
          meeting_id,
          user_id,
          char_count,
          leave_at: leave_at || new Date().toISOString()
        }
      ]);

    if (insertError) throw insertError;

    await updateTranslationCount(meeting_id, char_count);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Error in participantTranslationCount:", err);
    res.status(500).json({ error: err.message });
  }
});


  module.exports = router;
