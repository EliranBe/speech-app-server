const express = require("express");
  const router = express.Router();
  const { supabase } = require("../client/src/utils/supabaseClient");
  const crypto = require("crypto");
  const { SignJWT } = require("jose");


// Middleware לבדיקה אם המשתמש מחובר פחות מ־12 שעות
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
    if (hoursSinceSignIn > 2) {
      return res.status(401).json({ error: "Session expired — please log in again" });
    }

    req.user = user; // שומר את המשתמש בבקשה להמשך שימוש
    next();
  } catch (err) {
    console.error("checkLastSignIn error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function checkMonthlyLimit() {
  const now = new Date();
  const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("MonthlyTotalTranslationCounts")
    .select("total_translation_char_count")
    .eq("month_year", month_year)
    .single();

  if (error && error.code !== "PGRST116") { // אם זו לא שגיאה של "לא נמצא"
    throw new Error("Error checking monthly translation count");
  }

  if (data && data.total_translation_char_count >= Number(process.env.MONTHLY_TRANSLATION_LIMIT)) {

    return {
      limitExceeded: true,
      month_year
    };
  }

  return { limitExceeded: false };
}

async function checkMonthlyDurationLimit() {
  const now = new Date();
  const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("MonthlyTotalTranslationCounts")
    .select("total_duration_minutes")
    .eq("month_year", month_year)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error("Error checking monthly duration limit");
  }

  const durationLimit = Number(process.env.MONTHLY_DURATION_LIMIT);

  if (data && data.total_duration_minutes >= durationLimit) {
    return { limitExceeded: true, month_year };
  }

  return { limitExceeded: false };
}


router.get("/getMeeting", async (req, res) => {
    const { meeting_id } = req.query;
    if (!meeting_id) return res.status(400).json({ error: "Missing meeting_id" });

    const { data, error } = await supabase
        .from("Meetings")
        .select("*")
        .eq("meeting_id", meeting_id)
        .maybeSingle();

if (error || !data) return res.status(404).json({ error: "Meeting not found" }); 
  res.json({ meeting: data });
});


router.get("/checkValidity", async (req, res) => {
  const { meeting_id } = req.query;

  if (!meeting_id) {
    return res.status(400).json({ error: "Missing meeting_id" });
  }

  try {
    const { data, error } = await supabase
      .from("Meetings")
      .select("is_active")
      .eq("meeting_id", meeting_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    if (!data.is_active) {
      return res.status(403).json({ error: "Meeting is not active" });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error("Error checking meeting validity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// 🟠 עוקפים את האימות   
router.use((req, res, next) => {
  // דלג על האימות עבור הנתיבים שצוינו
  if (req.path === "/updateTranslationCount" || req.path === "/finishMeeting" || req.path === "/getMeeting" || req.path === "/checkMonthlyMeetingLimit" || req.path === "/incrementMonthlyMeetingCount" || req.path === "/checkAndUseMeetingTokenAtTheTable") {
    return next();
  }
  checkLastSignIn(req, res, next); // עבור כל שאר הנתיבים – תבדוק token כרגיל
});

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
      .setExpirationTime("55s")  //  התוקף 55 שניות
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


// ----------------------------------------------------
// ✅ בדיקה אם JWT כבר שומש (חד-פעמיות של אסימון)
// ----------------------------------------------------
router.get("/checkAndUseMeetingToken", async (req, res) => {
     const { jti } = req.query;

    if (!jti) {
      return res.status(400).json({ error: "Missing jti" });
    }

    try{
    const { data, error } = await supabase
      .from("UsedMeetingTokens")
      .select("*")
      .eq("jti", jti)
      .Single();

    if (error || !data) {
      return res.status(404).json({ error: "This meeting token has already been used" });
    }

    return res.json({ success: true });
  
   } catch (err) {
    console.error("❌ Error checking token usage:", err.message);
    res.status(500).json({ error: "Server error checking token usage" });
  }
});

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

async function checkAndUseMeetingTokenAtTheTable(jti) {
  // בודק אם הטוקן כבר קיים
  const { data: existing, error: selectError } = await supabase
    .from("UsedMeetingTokens")
    .select("*")
    .eq("jti", jti)
    .maybeSingle();

  if (selectError) {
    console.error("Error checking token:", selectError);
    throw new Error("Failed to check meeting token");
  }

  if (existing) {
    // אם כבר קיים, מחזיר שגיאה
    throw new Error("This meeting token has already been used");
  }

  // אם לא קיים — נרשום אותו כעת
  await new Promise(resolve => setTimeout(resolve, 10000));

  const { error: insertError } = await supabase
    .from("UsedMeetingTokens")
    .insert([{ jti, used_at: new Date().toISOString() }]);

  if (insertError) {
    console.error("Error inserting token:", insertError);
    throw new Error("Failed to mark meeting token as used");
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
      const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // זמן תפוגה של פרטי הפגישה שנוצרו במסך CreateSession
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
      
      const limitCheck = await checkMonthlyLimit();
if (limitCheck.limitExceeded) {
  return res.status(403).json({
    error: "Monthly translation limit reached. Please try again next month."
  });
}

          // בדיקת מגבלת דקות חודשיות
const durationCheck = await checkMonthlyDurationLimit();
if (durationCheck.limitExceeded) {
  return res.status(403).json({
    error: `Monthly duration limit reached. Please try again next month.`
  });
}

          // 🟢  בדיקה כמה פגישות פעילות קיימות
      const MAX_ACTIVE_MEETINGS = parseInt(process.env.MAX_ACTIVE_MEETINGS, 10);

if (isNaN(MAX_ACTIVE_MEETINGS)) {
  console.error("❌ MAX_ACTIVE_MEETINGS is not defined or invalid in .env");
  return res.status(500).json({ error: "Server configuration error" });
}

    const { count, error: countError } = await supabase
      .from("Meetings")
      .select("*", { count: "exact", head: true })
      .not("started_at", "is", null)
      .is("finished_at", null);

    if (countError) {
      console.error("Error checking active meetings");
      return res.status(500).json({ error: "Failed to check active meetings" });
    }

    if (count >= MAX_ACTIVE_MEETINGS) {
      console.warn("❌ Too many active meetings. Please try again later.");
      return res
        .status(429)
        .json({ error: "Too many active meetings. Please try again later." });
    }
      
      
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
      
                // בדיקת מגבלת כמות הפגישות החודשית
      if (user_id !== process.env.MEETING_LIMIT_EXEMPT_USER_ID) {
              try {
                await checkMonthlyMeetingLimit(user_id);
              } catch (err) {
                return res.status(403).json({ error: err.message });
              }
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
        "";

      const redirectUrl = `${CALL_BASE_URL}?userToken=${encodeURIComponent(
        meetingToken
      )}`;
      
      // עדכון שדה started_at לפגישה
      await setStartedAtIfNull(meeting_id);

          // עדכון כמות הפגישות בטבלה 
      incrementMonthlyMeetingCount(user_id).catch(console.error);

      // סיום אוטומטי לאחר 55 שניות
setTimeout(() => {
  finishMeetingLogic(meeting_id); // משתמש ב־meeting_id שנמצא/נבחר
}, 55 * 1000);
      
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
    
    const limitCheck = await checkMonthlyLimit();
if (limitCheck.limitExceeded) {
  return res.status(403).json({
    error: "Monthly translation limit reached. Please try again next month."
  });
}
    
    // בדיקת מגבלת דקות חודשיות
const durationCheck = await checkMonthlyDurationLimit();
if (durationCheck.limitExceeded) {
  return res.status(403).json({
    error: `Monthly duration limit reached. Please try again next month.`
  });
}

        // 🟢  בדיקה כמה פגישות פעילות קיימות
      const MAX_ACTIVE_MEETINGS = parseInt(process.env.MAX_ACTIVE_MEETINGS, 10);

if (isNaN(MAX_ACTIVE_MEETINGS)) {
  console.error("❌ MAX_ACTIVE_MEETINGS is not defined or invalid in .env");
  return res.status(500).json({ error: "Server configuration error" });
}

    const { count, error: countError } = await supabase
      .from("Meetings")
      .select("*", { count: "exact", head: true })
      .not("started_at", "is", null)
      .is("finished_at", null);

    if (countError) {
      console.error("Error checking active meetings");
      return res.status(500).json({ error: "Failed to check active meetings" });
    }

    if (count >= MAX_ACTIVE_MEETINGS) {
      console.warn("❌ Too many active meetings. Please try again later.");
      return res
        .status(429)
        .json({ error: "Too many active meetings. Please try again later." });
    }
    

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

                    // בדיקת מגבלת כמות הפגישות החודשית
    if (user_id !== process.env.MEETING_LIMIT_EXEMPT_USER_ID) {
          try {
            await checkMonthlyMeetingLimit(user_id);
          } catch (err) {
            return res.status(403).json({ error: err.message });
          }
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
      "";

    const redirectUrl = `${CALL_BASE_URL}?userToken=${encodeURIComponent(meetingToken)}`;
    
    // עדכון שדה started_at לפגישה
      await setStartedAtIfNull(meeting_id_to_use);
    
              // עדכון כמות הפגישות בטבלה 
      incrementMonthlyMeetingCount(user_id).catch(console.error);
    
    // סיום אוטומטי לאחר 55 שניות
setTimeout(() => {
  finishMeetingLogic(meeting_id_to_use); // משתמש ב־meeting_id שנמצא/נבחר
}, 55 * 1000);

    return res.status(200).json({
      participant: participantRow || newParticipant || null,
      url: redirectUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ עדכון מספר התווים בסוף כל פגישה
router.post("/updateTranslationCount", async (req, res) => {
  try {
    const { meeting_id, translation_char_count } = req.body;

        console.log("🔹 updateTranslationCount called");
    console.log("📌 Meeting ID:", meeting_id);
    console.log(`🔢 Total translation char count at this meeting for ${req.user?.display_name || "Unknown"}: ${translation_char_count}`);
    
    if (!meeting_id || translation_char_count == null) {
      return res.status(400).json({ error: "Missing meeting_id or translation_char_count" });
    }

    // 1. הבאת started_at מהפגישה
    const { data: meeting, error: meetingError } = await supabase
      .from("Meetings")
      .select("started_at")
      .eq("meeting_id", meeting_id)
      .single();

    if (meetingError || !meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const startedAt = new Date(meeting.started_at);
    const month_year = `${startedAt.getFullYear()}-${String(startedAt.getMonth() + 1).padStart(2, "0")}`;

// 2. עדכון ספירת התווים של הפגישה — חיבור במקום החלפה
const { data: existingMeeting, error: getMeetingError } = await supabase
  .from("Meetings")
  .select("translation_char_count")
  .eq("meeting_id", meeting_id)
  .single();

if (getMeetingError || !existingMeeting) {
  throw getMeetingError || new Error("Meeting not found");
}

const newTranslationCharCount = (existingMeeting.translation_char_count || 0) + translation_char_count;

const { error: updateError } = await supabase
  .from("Meetings")
  .update({ translation_char_count: newTranslationCharCount })
  .eq("meeting_id", meeting_id);

if (updateError) throw updateError;
console.log("✅ Updated meeting with translation_char_count:", newTranslationCharCount);

// 3. חיבור הערך החדש לסכום החודשי הקיים במקום חישוב מחדש
const { data: existingMonth, error: existingError } = await supabase
  .from("MonthlyTotalTranslationCounts")
  .select("total_translation_char_count")
  .eq("month_year", month_year)
  .single();

let newTotalTranslationCharCount = translation_char_count; // ערך ברירת מחדל אם אין חודש קיים

if (!existingError && existingMonth) {
  newTotalTranslationCharCount = (existingMonth.total_translation_char_count || 0) + translation_char_count;
}

// 4. עדכון או יצירת רשומה בטבלת MonthlyTotalTranslationCounts
if (existingError || !existingMonth) {
  // יצירת רשומה חדשה אם לא קיימת
  const { error: insertError } = await supabase
    .from("MonthlyTotalTranslationCounts")
    .insert([{ month_year, total_translation_char_count: newTotalTranslationCharCount }]);
  if (insertError) throw insertError;
} else {
  // עדכון רשומה קיימת
  const { error: updateMonthError } = await supabase
    .from("MonthlyTotalTranslationCounts")
    .update({ total_translation_char_count: newTotalTranslationCharCount })
    .eq("month_year", month_year);
  if (updateMonthError) throw updateMonthError;
}


    return res.json({
      success: true,
      month_year,
      total_translation_char_count: newTotalTranslationCharCount
    });
  } catch (err) {
    console.error("❌ Error updating translation count:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ עדכון שעת סיום הפגישה (finished_at)
router.post("/finishMeeting", async (req, res) => {
  try {
    const { meeting_id, finished_at } = req.body;

    console.log("🔹 finishMeeting called");
    console.log("📌 Meeting ID:", meeting_id);
    console.log("⏰ finished_at:", finished_at);

    if (!meeting_id || !finished_at) {
      return res.status(400).json({ error: "Missing meeting_id or finished_at" });
    }

    // עדכון השדה בטבלת Meetings
// 1️⃣ קבלת השורה הנוכחית מהטבלה
const { data: meetingRow, error: meetingStartError } = await supabase
  .from("Meetings")
  .select("finished_at, expiry")
  .eq("meeting_id", meeting_id)
  .single();

if (meetingStartError || !meetingRow) {
  console.error("❌ Meeting not found:", meetingStartError?.message);
  return res.status(404).json({ error: "Meeting not found" });
}

// 2️⃣ הכנת אובייקט לעדכון בהתאם לערכים קיימים
const updateData = { is_active: false }; // תמיד נשאר עדכון ל-is_active

if (!meetingRow.finished_at) {
  updateData.finished_at = finished_at;
}
if (!meetingRow.expiry) {
  updateData.expiry = finished_at;
}

// 3️⃣ ביצוע העדכון
const { error: updateError } = await supabase
  .from("Meetings")
  .update(updateData)
  .eq("meeting_id", meeting_id);

if (updateError) {
  console.error("❌ Error updating finished_at and expiry in Meetings:", updateError.message);
  return res.status(500).json({ error: updateError.message });
}

    
// עדכון is_active לכל המשתתפים בטבלת Participants
const { error: participantUpdateError } = await supabase
  .from("Participants")
  .update({ is_active: false })
  .eq("meeting_id", meeting_id);
if (participantUpdateError) {
  console.error("❌ Error updating is_active in Participants:", participantUpdateError.message);
  }
  
        // 🧮 חישוב זמן פגישה בדקות (בעיגול כלפי מעלה)
    const { data: meetingData, error: meetingFetchError } = await supabase
      .from("Meetings")
      .select("started_at")
      .eq("meeting_id", meeting_id)
      .single();

    if (meetingFetchError || !meetingData?.started_at) {
      console.error("❌ Error fetching started_at:", meetingFetchError?.message);
    } else {
      const start = new Date(meetingData.started_at);
      const finish = new Date(finished_at);
      const diffMs = finish - start;
      const diffMinutes = Math.ceil(diffMs / (1000 * 60)); // עיגול מעלה גם אם עברו שניות בודדות

      // עדכון משך הפגישה בטבלת Meetings
      const { error: durationUpdateError } = await supabase
        .from("Meetings")
        .update({ duration_minutes: diffMinutes })
        .eq("meeting_id", meeting_id);

      if (durationUpdateError) {
        console.error("❌ Error updating duration_minutes:", durationUpdateError.message);
      } else {
        console.log(`🕒 duration_minutes updated: ${diffMinutes}`);

        // עדכון סך הדקות בטבלה החודשית
        const month_year = `${finish.getFullYear()}-${String(finish.getMonth() + 1).padStart(2, "0")}`;

        const { data: existingMonth, error: existingError } = await supabase
          .from("MonthlyTotalTranslationCounts")
          .select("total_duration_minutes")
          .eq("month_year", month_year)
          .maybeSingle();

        let newTotalDuration = diffMinutes;

        if (existingMonth && !existingError) {
          newTotalDuration = (existingMonth.total_duration_minutes || 0) + diffMinutes;

          const { error: updateMonthError } = await supabase
            .from("MonthlyTotalTranslationCounts")
            .update({ total_duration_minutes: newTotalDuration })
            .eq("month_year", month_year);

          if (updateMonthError) console.error("❌ Error updating total_duration_minutes:", updateMonthError.message);
          else console.log(`📊 Updated total_duration_minutes for ${month_year}: ${newTotalDuration}`);
        } else {
          const { error: insertMonthError } = await supabase
            .from("MonthlyTotalTranslationCounts")
            .insert([{ month_year, total_duration_minutes: newTotalDuration }]);

          if (insertMonthError) console.error("❌ Error inserting total_duration_minutes:", insertMonthError.message);
          else console.log(`📊 Created total_duration_minutes for ${month_year}: ${newTotalDuration}`);
        }
      }
    }

    if (updateError) {
      console.error("❌ Error updating finished_at:", updateError.message);
      return res.status(500).json({ error: updateError.message });
    }

    console.log(`✅ Meeting ${meeting_id} finished_at updated successfully.`);
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Error in /finishMeeting:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

async function finishMeetingLogic(meeting_id) {
  const finished_at = new Date().toISOString();

  const { data: meetingRow } = await supabase
    .from("Meetings")
    .select("finished_at, expiry")
    .eq("meeting_id", meeting_id)
    .single();

  if (!meetingRow) return;

  const updateData = { is_active: false };
  if (!meetingRow.finished_at) updateData.finished_at = finished_at;
  if (!meetingRow.expiry) updateData.expiry = finished_at;

  await supabase.from("Meetings").update(updateData).eq("meeting_id", meeting_id);
  await supabase.from("Participants").update({ is_active: false }).eq("meeting_id", meeting_id);

  const { data: meetingData } = await supabase.from("Meetings").select("started_at").eq("meeting_id", meeting_id).single();
  if (meetingData?.started_at) {
    const start = new Date(meetingData.started_at);
    const finish = new Date(finished_at);
    const diffMinutes = Math.ceil((finish - start) / (1000 * 60));

    await supabase.from("Meetings").update({ duration_minutes: diffMinutes }).eq("meeting_id", meeting_id);

    const month_year = `${finish.getFullYear()}-${String(finish.getMonth() + 1).padStart(2, "0")}`;
    const { data: existingMonth } = await supabase
      .from("MonthlyTotalTranslationCounts")
      .select("total_duration_minutes")
      .eq("month_year", month_year)
      .maybeSingle();

    const newTotalDuration = diffMinutes + (existingMonth?.total_duration_minutes || 0);
    if (existingMonth) {
      await supabase.from("MonthlyTotalTranslationCounts")
        .update({ total_duration_minutes: newTotalDuration })
        .eq("month_year", month_year);
    } else {
      await supabase.from("MonthlyTotalTranslationCounts")
        .insert([{ month_year, total_duration_minutes: newTotalDuration }]);
    }
  }
}

// בודק אם המשתמש כבר הגיע למגבלת הפגישות בחודש
async function checkMonthlyMeetingLimit(user_id) {
  const now = new Date();
  const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("MonthlyUserMeetings")
    .select("monthly_meeting_count")
    .eq("user_id", user_id)
    .eq("month_year", month_year)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = לא נמצא
    throw new Error("Error checking monthly meetings count");
  }

  const monthlyLimit = Number(process.env.MONTHLY_MEETING_LIMIT);
  if (data && data.monthly_meeting_count >= monthlyLimit) {
    throw new Error("Monthly meeting limit exceeded (max 4 per month).");
  }
}

// מוסיף 1 לספירת הפגישות של המשתמש בחודש
async function incrementMonthlyMeetingCount(user_id) {
  const now = new Date();
  const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("MonthlyUserMeetings")
    .select("monthly_meeting_count")
    .eq("user_id", user_id)
    .eq("month_year", month_year)
    .single();

  if (!data || error?.code === "PGRST116") {
    // אין רשומה קיימת → צור חדשה
    await supabase
      .from("MonthlyUserMeetings")
      .insert([{ user_id, month_year, monthly_meeting_count: 1 }]);
  } else {
    // עדכן ספירה קיימת
    await supabase
      .from("MonthlyUserMeetings")
      .update({ monthly_meeting_count: data.monthly_meeting_count + 1 })
      .eq("user_id", user_id)
      .eq("month_year", month_year);
  }
}



  module.exports = router;
