// speech-app-server/routes/sessionRoutes.js
const express = require("express");
const { validateSession } = require("../validation/sessionValidator.js");

const router = express.Router();

router.post("/session", (req, res) => {
  const session = req.body;

  const result = validateSession(session);

  if (!result.valid) {
    return res.status(400).json({ 
      message: "Invalid session data", 
      errors: result.errors 
    });
  }

  // אם הנתונים תקינים → להמשיך
  res.status(201).json({ message: "Session created successfully ✅" });
});

module.exports = router;
