const { supabase } = require('../utils/supabaseClient');

async function checkBlockedUser(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    const user_id = data.user.id;
    const blockedList = process.env.BLOCKED_USER_IDS
      ? process.env.BLOCKED_USER_IDS.split(",").map(id => id.trim())
      : [];

    if (blockedList.includes(user_id)) {
      return res.status(403).json({ error: "User is blocked from using this service" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error("checkBlockedUser error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = checkBlockedUser;
