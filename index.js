const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// מאפשר הגשת קבצים סטטיים מתוך תיקיית public
app.use(express.static('public'));

// בדיקת תקינות (לא חובה כשיש index.html)
app.get('/', (req, res) => {
  res.send('🎉 השרת פועל בהצלחה!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

