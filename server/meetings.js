// speech-app-server/server/meetings.js

const express = require("express");
const router = express.Router();
const { supabase } = require("../utils/supabaseClient"); // חיבור ל-Supabase
const { v4: uuidv4 } = require("uuid"); // ליצירת מזהה ייחודי לפגישה

// =======================================
// יצירת פגישה חדשה
// =======================================
router.post("/create", async (req, res) => {
  try {
    const { host_user_id, meeting_password } = req.body;

    if (!host_user_id) {
      return res.status(400).json({ error: "host_user_id is required" });
    }

    // יצירת מזהה פגישה ייחודי
    const meeting_id = uuidv4();
    const url_meeting = `https://yourapp.com/meetings/${meeting_id}`;
    const qr_data = url_meeting;

    const { data, error } = await supabase.from("Meetings").insert([
      {
        host_user_id,
        meeting_password: meeting_password || "1234",
        created_at: new Date().toISOString(),
        is_active: true,
        meeting_id,
        url_meeting,
        qr_data
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
