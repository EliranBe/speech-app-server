// speech-app-server/validation/sessionValidator.js
import Ajv from "ajv";
import schema from "../VerboSession.json" assert { type: "json" };

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export function validateSession(session) {
  const valid = validate(session);
  if (!valid) {
    return { valid: false, errors: validate.errors };
  }
  return { valid: true };
}
