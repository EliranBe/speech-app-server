// speech-app-server/validation/userPreferencesValidator.js
const Ajv = require("ajv");
const schema = require("../client/Entities/UserPreferences.json");

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function validateUserPreferences(preferences) {
  const valid = validate(preferences);
  if (!valid) {
    return { valid: false, errors: validate.errors };
  }
  return { valid: true };
}

module.exports = { validateUserPreferences };
