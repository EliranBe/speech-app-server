'use strict';
const { TextToSpeechClient } = require('@google-cloud/text-to-speech').v1;

const texttospeechClient = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
});

/**
 * synthesizeStreaming
 * פונקציה שמקבלת טקסט ומבצעת סטרימינג של אודיו
 * @param {string} text - הטקסט להמרה לדיבור
 * @returns {Promise<void>}
 */
async function synthesizeStreaming(text) {
  return new Promise(async (resolve, reject) => {
    const stream = await texttospeechClient.streamingSynthesize();

    stream.on('data', (response) => {
      if (response.audioContent) {
        console.log('קיבלתי חלק אודיו בגודל:', response.audioContent.length);
        // כאן אפשר לנגן או לשמור את ה-Buffer
      }
    });

    stream.on('error', (err) => {
      console.error('Error:', err);
      reject(err); // חשוב! אחרת ה-Promise לא יכשל
    });

    stream.on('end', () => {
      console.log('Streaming ended');
      resolve(); // מסמן שהסטרימינג הסתיים בהצלחה
    });

    // שולחים את ההגדרות
    stream.write({
      streamingConfig: {
        voice: { languageCode: 'he-IL', ssmlGender: 'MALE' },
        audioConfig: { audioEncoding: 'MP3' },
      }
    });

    // שולחים את הטקסט בפועל
    stream.write({
      input: { text }
    });

    stream.end();
  });
}

module.exports = { synthesizeStreaming };
