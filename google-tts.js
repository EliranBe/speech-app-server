const textToSpeech = require('@google-cloud/text-to-speech');

/**
 * יצירת לקוח Google TTS עם JSON שהגדרת ב-ENV
 */
const client = new textToSpeech.TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
});

/**
 * synthesizeTextToBase64
 * פונקציה שמקבלת טקסט ומחזירה את האודיו כ-Base64
 * @param {string} text - הטקסט שברצונך להמיר לקול
 * @param {string} languageCode - קוד שפה שעליו יופע ה-TTS, למשל 'en-US' או 'he-IL'
 * @param {string} gender - 'NEUTRAL', 'MALE' או 'FEMALE'
 * @param {string} [voiceName] - שם הקול הספציפי ב-Google TTS, למשל 'he-IL-Wavenet-B'
 * @returns {Promise<string>} Base64 של האודיו
 */
async function synthesizeTextToBase64(text, languageCode = 'he-IL', gender = 'MALE', voiceName = "he-IL-Standard-B") {
  const request = {
    input: { text },
    voice: { 
      languageCode, 
      ssmlGender: gender,
      ...(voiceName && { name: voiceName }) // מוסיף את השדה רק אם מוגדר
    },
    audioConfig: { audioEncoding: 'MP3' }, // אפשר גם 'LINEAR16' ל-WAV
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    // המרה ל-Base64
    const audioBase64 = response.audioContent.toString('base64');
    return audioBase64;
  } catch (err) {
    console.error('Google TTS error:', err);
    throw err;
  }
}

module.exports = { synthesizeTextToBase64 };
