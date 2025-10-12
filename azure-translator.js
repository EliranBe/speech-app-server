const axios = require("axios");

// מיפוי native_language לקוד שפה של Azure
function mapNativeLanguageToAzure(nativeLanguage) {
  const map = {
    "Australia (English)": "en",
    "Belgium (Dutch)": "nl",
    "Brazil (Portuguese)": "pt-br",
    "Denmark (Danish)": "da",
    "France (French)": "fr",
    "Germany (German)": "de",
    "India (English)": "en",
    "Indonesia (Indonesian)": "id",
    "Italy (Italian)": "it",
    "Japan (Japanese)": "ja",
    "Netherlands (Dutch)": "nl",
    "Norway (Norwegian)": "nb",
    "Portugal (Portuguese)": "pt-pt",
    "Russia (Russian)": "ru",
    "Spain (Spanish)": "es",
    "Sweden (Swedish)": "sv",
    "Turkey (Turkish)": "tr",
    "UK (English)": "en",
    "USA (English)": "en",
    "USA (Spanish)": "es"
  };
  return map[nativeLanguage]; // ללא ברירת מחדל 
}

const subscriptionKey = process.env.AZURE_TRANSLATOR_KEY1;
const endpoint = process.env["AZURE_TRANSLATOR_ENDPOINT"];
const region = process.env["AZURE_TRANSLATOR_REGION"];

async function translateText(inputText, currentUserLang, otherUsersLangs) {
  if (!subscriptionKey) {
    throw new Error("⚠️ Missing AZURE_TRANSLATOR_KEY1 in environment variables");
  }

  // חישוב שפת מקור
  const fromLang = mapNativeLanguageToAzure(currentUserLang);

  // חישוב שפות יעד (שאר המשתמשים)
  const toLangs = otherUsersLangs
    .map(lang => mapNativeLanguageToAzure(lang))
    .filter((value, index, self) => self.indexOf(value) === index) // הסרת כפילויות
    .join(",");

  console.log("🌐 Azure Translator - from:", fromLang);
  console.log("🌐 Azure Translator - to:", toLangs);

  const url = `${endpoint}/translate`;
  const params = {
    "api-version": "3.0",
    from: fromLang,
    to: toLangs
  };

  const headers = {
    "Ocp-Apim-Subscription-Key": subscriptionKey,
    "Ocp-Apim-Subscription-Region": region,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, [{ Text: inputText }], { params, headers });

    const translations = response.data?.[0]?.translations || [];
    const results = {};
    translations.forEach(t => {
      results[t.to] = t.text;
    });

    return results;

  } catch (err) {
    console.error("❌ Translation API error:", err.message);
    return {};
  }
}

module.exports = { translateText, mapNativeLanguageToAzure };
