// routes/userPreferencesRoutes.js
const express = require("express");
const router = express.Router();

// ייבוא ה-validator
const { validateUserPreferences } = require("../validation/userPreferencesValidator");

// Route לשמירת העדפות משתמש
router.post("/user-preferences", (req, res) => {
  const preferences = req.body;

  // בדיקה עם ה-validator
  const result = validateUserPreferences(preferences);

  if (!result.valid) {
    // אם יש שגיאות
    return res.status(400).json({
      success: false,
      errors: result.errors
    });
  }

  // כאן אפשר להמשיך לשמור את הנתונים במסד הנתונים או לבצע פעולות נוספות
  return res.json({
    success: true,
    message: "User preferences are valid and saved successfully!"
  });
});

module.exports = router;
