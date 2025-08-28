const WebSocket = require('ws');
const express = require('express'); // אם צריך app
const TextTranslationClient = require("@azure-rest/ai-translation-text").default,
  { isUnexpected } = require("@azure-rest/ai-translation-text");
const { DefaultAzureCredential } = require("@azure/identity");

module.exports = function startWebSocketServer(server, app) {
  const wss = new WebSocket.Server({ server }); // server מגיע מ-index.js

const endpoint = process.env["AZURE_TRANSLATOR_ENDPOINT"];
const resourceId = process.env["AZURE_TRANSLATOR_RESOURCE_ID"];
const region = process.env["AZURE_TRANSLATOR_REGION"];
const AZURETRANSLATORApiKEY1 = process.env["AZURE_TRANSLATOR_KEY1"];


  
}



