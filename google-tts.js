const textToSpeech = require('@google-cloud/text-to-speech');

const client = new textToSpeech.TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
});

/**
 * מיפוי native_language ל-languageCode
 */
function mapNativeLanguageToCode(nativeLanguage) {
  const map = {
    "Australia (English)": "en-AU",
    "Belgium (Dutch)": "nl-BE",
    "Brazil (Portuguese)": "pt-BR",
    "Denmark (Danish)": "da-DK",
    "France (French)": "fr-FR",
    "Germany (German)": "de-DE",
    "India (English)": "en-IN",
    "Indonesia (Indonesian)": "id-ID",
    "Italy (Italian)": "it-IT",
    "Japan (Japanese)": "ja-JP",
    "Netherlands (Dutch)": "nl-NL",
    "Norway (Norwegian)": "nb-NO",
    "Portugal (Portuguese)": "pt-PT",
    "Russia (Russian)": "ru-RU",
    "Spain (Spanish)": "es-ES",
    "Sweden (Swedish)": "sv-SE",
    "Turkey (Turkish)": "tr-TR",
    "UK (English)": "en-GB",
    "USA (English)": "en-US",
    "USA (Spanish)": "es-US"
  };
  return map[nativeLanguage] || 'ru-RU'; // ברירת מחדל
}

/**
 * מיפוי languageCode + gender ל־voiceName
 */
function mapVoiceName(languageCode, gender) {
  const voices = {
    "en-AU": { MALE: "en-AU-Chirp3-HD-Schedar", FEMALE: "en-AU-Chirp3-HD-Sulafat" },
    "en-GB": { MALE: "en-GB-Chirp3-HD-Schedar", FEMALE: "en-GB-Chirp3-HD-Sulafat" },
    "en-US": { MALE: "en-US-Chirp3-HD-Schedar", FEMALE: "en-US-Chirp3-HD-Sulafat" },
    "es-ES": { MALE: "es-ES-Chirp3-HD-Schedar", FEMALE: "es-ES-Chirp3-HD-Sulafat" },
    "es-US": { MALE: "es-US-Chirp3-HD-Schedar", FEMALE: "es-US-Chirp3-HD-Sulafat" },
    "fr-FR": { MALE: "fr-FR-Chirp3-HD-Schedar", FEMALE: "fr-FR-Chirp3-HD-Sulafat" },
    "de-DE": { MALE: "de-DE-Chirp3-HD-Schedar", FEMALE: "de-DE-Chirp3-HD-Sulafat" },
    "en-IN": { MALE: "en-IN-Chirp3-HD-Schedar", FEMALE: "en-IN-Chirp3-HD-Sulafat" },
    "ru-RU": { MALE: "ru-RU-Chirp3-HD-Charon", FEMALE: "ru-RU-Chirp3-HD-Aoede" },
    "pt-BR": { MALE: "pt-BR-Chirp3-HD-Schedar", FEMALE: "pt-BR-Chirp3-HD-Sulafat" },
    "pt-PT": { MALE: "pt-PT-Wavenet-F", FEMALE: "pt-PT-Wavenet-E" },
    "ja-JP": { MALE: "ja-JP-Chirp3-HD-Schedar", FEMALE: "ja-JP-Chirp3-HD-Sulafat" },
    "it-IT": { MALE: "it-IT-Chirp3-HD-Schedar", FEMALE: "it-IT-Chirp3-HD-Sulafat" },
    "nl-NL": { MALE: "nl-NL-Chirp3-HD-Schedar", FEMALE: "nl-NL-Chirp3-HD-Sulafat" },
    "nl-BE": { MALE: "nl-BE-Chirp3-HD-Schedar", FEMALE: "nl-BE-Chirp3-HD-Sulafat" },
    "sv-SE": { MALE: "sv-SE-Chirp3-HD-Schedar", FEMALE: "sv-SE-Chirp3-HD-Sulafat" },
    "da-DK": { MALE: "da-DK-Chirp3-HD-Schedar", FEMALE: "da-DK-Chirp3-HD-Sulafat" },
    "tr-TR": { MALE: "tr-TR-Chirp3-HD-Schedar", FEMALE: "tr-TR-Chirp3-HD-Sulafat" },
    "nb-NO": { MALE: "nb-NO-Chirp3-HD-Schedar", FEMALE: "nb-NO-Chirp3-HD-Sulafat" },
    "id-ID": { MALE: "id-ID-Chirp3-HD-Schedar", FEMALE: "id-ID-Chirp3-HD-Sulafat" }
  };
  return voices[languageCode]?.[gender] || null;
}

/**
 * synthesizeTextToBase64
 * @param {string} text - הטקסט להמרה
 * @param {object} jwtPayload - ה־JWT של המשתמש
 * @returns {Promise<string>} Base64 של האודיו
 */
async function synthesizeTextToBase64(text, jwtPayload) {
  const languageCode = mapNativeLanguageToCode(jwtPayload.native_language);
  const gender = jwtPayload.gender || "FEMALE";
  const voiceName = mapVoiceName(languageCode, gender);

  const request = {
    input: { text },
    voice: {
      languageCode,
      ssmlGender: gender,
      ...(voiceName && { name: voiceName })
    },
    audioConfig: { audioEncoding: 'MP3' }
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    return response.audioContent.toString('base64');
  } catch (err) {
    console.error('Google TTS error:', err);
    throw err;
  }
}

module.exports = { synthesizeTextToBase64 };
