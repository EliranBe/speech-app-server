const axios = require("axios");

const subscriptionKey = process.env.AZURE_TRANSLATOR_KEY1; // המפתח הישיר
const endpoint = process.env["AZURE_TRANSLATOR_ENDPOINT"];
const region = process.env["AZURE_TRANSLATOR_REGION"];

// פונקציה כללית לתרגום טקסט
async function translateText(inputText, fromLanguage = "en", toLanguage = "he") {
   if (!subscriptionKey) {
    throw new Error("⚠️ Missing AZURE_TRANSLATOR_KEY1 in environment variables");
  }

  try {
    const response = await axios({
      baseURL: endpoint,
      url: "/translate",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      params: {
        "api-version": "3.0",
        from: fromLanguage,
        to: toLanguage,
      },
      data: [{ Text: inputText }],
      responseType: "json",
    });

    return response.data?.[0]?.translations?.[0]?.text || "";
  } catch (err) {
    console.error("❌ Translation API error:", err.message);
    throw err;
  }
}

module.exports = { translateText };
