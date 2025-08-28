const TextTranslationClient = require("@azure-rest/ai-translation-text").default,
  { isUnexpected } = require("@azure-rest/ai-translation-text");
const { DefaultAzureCredential } = require("@azure/identity");

const endpoint = process.env["AZURE_TRANSLATOR_ENDPOINT"];
const resourceId = process.env["AZURE_TRANSLATOR_RESOURCE_ID"];
const region = process.env["AZURE_TRANSLATOR_REGION"];

async function main() {
  console.log("== Multiple target languages translation ==");

  const translateCedential = {
    tokenCredential: new DefaultAzureCredential(),
    azureResourceId: resourceId,
    region,
  };
  const translationClient = TextTranslationClient(endpoint, translateCedential);

  const inputText = [{ text: "This is a test." }];
  const translateResponse = await translationClient.path("/translate").post({
    body: inputText,
    queryParameters: {
      to: "he",
      from: "en",
    },
  });

  if (isUnexpected(translateResponse)) {
    throw translateResponse.body.error;
  }

  const translations = translateResponse.body;
  for (const translation of translations) {
    for (const textKey in translation.translations) {
      console.log(
        `Text was translated to: '${translation?.translations[textKey]?.to}' and the result is: '${translation?.translations[textKey]?.text}'.`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
});

module.exports = { main };



