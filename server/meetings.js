const express = require("express");
const router = express.Router();
const { supabase } = require("../client/src/utils/supabaseClient");
const crypto = require("crypto");

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

// פונקציה ליצירת URL אקראי לפגישה
function generateMeetingUrl() {
  const randomString = crypto.randomBytes(8).toString("hex"); // 16 תווים אקראיים
  const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
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
// הצטרפות לפגישה קיימת
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
