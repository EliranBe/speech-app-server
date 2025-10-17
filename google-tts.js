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
  return map[nativeLanguage]; // ללא ברירת מחדל
}

/**
 * מיפוי languageCode + gender ל־voiceName
 */
function mapVoiceName(languageCode, gender) {
  const voices = {
    "en-AU": { MALE: "en-AU-Wavenet-D", FEMALE: "en-AU-Wavenet-C" },
    "en-GB": { MALE: "en-GB-Wavenet-D", FEMALE: "en-GB-Wavenet-C" },
    "en-US": { MALE: "en-US-Wavenet-D", FEMALE: "en-US-Wavenet-C" },
    "es-ES": { MALE: "es-ES-Wavenet-G", FEMALE: "es-ES-Wavenet-F" },
    "es-US": { MALE: "es-US-Wavenet-C", FEMALE: "es-US-Wavenet-A" },
    "fr-FR": { MALE: "fr-FR-Wavenet-G", FEMALE: "fr-FR-Wavenet-F" },
    "de-DE": { MALE: "de-DE-Wavenet-H", FEMALE: "de-DE-Wavenet-G" },
    "en-IN": { MALE: "en-IN-Wavenet-C", FEMALE: "en-IN-Wavenet-D" },
    "ru-RU": { MALE: "ru-RU-Wavenet-D", FEMALE: "ru-RU-Wavenet-C" },
    "pt-BR": { MALE: "pt-BR-Wavenet-E", FEMALE: "pt-BR-Wavenet-C" },
    "pt-PT": { MALE: "pt-PT-Wavenet-F", FEMALE: "pt-PT-Wavenet-E" },
    "ja-JP": { MALE: "ja-JP-Wavenet-D", FEMALE: "ja-JP-Wavenet-A" },
    "it-IT": { MALE: "it-IT-Wavenet-F", FEMALE: "it-IT-Wavenet-E" },
    "nl-NL": { MALE: "nl-NL-Wavenet-G", FEMALE: "nl-NL-Wavenet-F" },
    "nl-BE": { MALE: "nl-BE-Wavenet-D", FEMALE: "nl-BE-Wavenet-C" },
    "sv-SE": { MALE: "sv-SE-Wavenet-G", FEMALE: "sv-SE-Wavenet-F" },
    "da-DK": { MALE: "da-DK-Wavenet-G", FEMALE: "da-DK-Wavenet-F" },
    "tr-TR": { MALE: "tr-TR-Wavenet-E", FEMALE: "tr-TR-Wavenet-C" },
    "nb-NO": { MALE: "nb-NO-Wavenet-G", FEMALE: "nb-NO-Wavenet-F" },
    "id-ID": { MALE: "id-ID-Wavenet-C", FEMALE: "id-ID-Wavenet-D" }
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
  const gender = jwtPayload.gender;
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
    console.error('Google TTS error');
    throw err;
  }
}

module.exports = { synthesizeTextToBase64 };
