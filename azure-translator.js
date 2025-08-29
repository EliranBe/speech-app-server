const axios = require("axios");
 
const subscriptionKey = process.env.AZURE_TRANSLATOR_KEY1; // המפתח הישיר
const endpoint = process.env["AZURE_TRANSLATOR_ENDPOINT"];
const region = process.env["AZURE_TRANSLATOR_REGION"];

// פונקציה כללית לתרגום טקסט

async function translateText(text) {
        const baseURL= endpoint;
const url = `${endpoint}/translate`;
  const params = {
    'api-version': '3.0',
    from: 'en',
    to: ['he', 'ar']  // Axios ימיר את זה ל-to=he&to=ar
  };

  const headers = {
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    'Ocp-Apim-Subscription-Region': region,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(url, [{ Text: text }], { params, headers });
    return response.data;
  } catch (err) {
    console.error('Translation error:', err.response?.data || err.message);
  }
}

module.exports = { translateText };
