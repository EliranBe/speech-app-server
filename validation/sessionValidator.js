// speech-app-server/validation/sessionValidator.js
const Ajv = require("ajv");
const schema = require("../client/src/Entities/VerboSession.json");

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function validateSession(session) {
  const valid = validate(session);
  if (!valid) {
    return { valid: false, errors: validate.errors };
  }
  return { valid: true };
}

module.exports = { validateSession };
