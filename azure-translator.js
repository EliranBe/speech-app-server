const TextTranslationClient = require("@azure-rest/ai-translation-text").default;
const { isUnexpected } = require("@azure-rest/ai-translation-text");
const { DefaultAzureCredential } = require("@azure/identity");

const endpoint = process.env["AZURE_TRANSLATOR_ENDPOINT"];
const resourceId = process.env["AZURE_TRANSLATOR_RESOURCE_ID"];
const region = process.env["AZURE_TRANSLATOR_REGION"];

// קודם יוצרים את ה-credential ואז את ה-client
const translateCredential = {
  tokenCredential: new DefaultAzureCredential(),
  azureResourceId: resourceId,
  region,
};

const translationClient = TextTranslationClient(endpoint, translateCredential);

// פונקציה כללית לתרגום טקסט
async function translateText(inputText, toLanguage = 'he', fromLanguage = 'en') {
  const requestBody = [{ text: inputText }];

  const translateResponse = await translationClient.path("/translate").post({
    body: requestBody,
    queryParameters: {
      to: toLanguage,
      from: fromLanguage,
    },
  });

  if (isUnexpected(translateResponse)) {
    throw translateResponse.body.error;
  }

  // מחזיר את הטקסט המתורגם הראשון
  const translations = translateResponse.body;
  return translations[0]?.translations[0]?.text || '';
}

module.exports = { translateText };
