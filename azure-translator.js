const axios = require("axios");

const subscriptionKey = process.env.AZURE_TRANSLATOR_KEY1; // המפתח הישיר
const endpoint = process.env["AZURE_TRANSLATOR_ENDPOINT"];
const region = process.env["AZURE_TRANSLATOR_REGION"];

// פונקציה כללית לתרגום טקסט
async function translateText(inputText) {
   if (!subscriptionKey) {
    throw new Error("⚠️ Missing AZURE_TRANSLATOR_KEY1 in environment variables");
  }

const url = `${endpoint}/translate`;
  const params = {
    "api-version": "3.0",
    from: "es",
    to: "en,ru"
  };
  const headers = {
    "Ocp-Apim-Subscription-Key": subscriptionKey,
    "Ocp-Apim-Subscription-Region": region,
    "Content-Type": "application/json",
  };

   try {
    const response = await axios.post(url, [{ Text: inputText }], { params, headers });

    // response.data[0] הוא הטקסט הראשון
    const translations = response.data?.[0]?.translations || [];

    // לולאה על כל התרגומים
    const results = {};
    translations.forEach(t => {
      results[t.to] = t.text; // key = שפת יעד, value = הטקסט המתורגם
    });

    return results;
       
  } catch (err) {
console.error("❌ Translation API error:", err.message);
       return {};
      }
}

module.exports = { translateText };
