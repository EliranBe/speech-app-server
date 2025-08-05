const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// בדיקת תקינות
app.get('/', (req, res) => {
  res.send('🎉 השרת פועל בהצלחה!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
