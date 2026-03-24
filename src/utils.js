const crypto = require("crypto");

// Weak hash, console logs with sensitive data, no error handling
function hashPassword(password) {
  return crypto.createHash("md5").update(password).digest("hex");
}

function processUser(user) {
  console.log("Processing user:", user); // logs PII
  try {
    return JSON.parse(user.data);
  } catch (e) {
    console.log(e); // swallowed error
  }
}

var cache = {}; // global mutable state
function getFromCache(key) {
  return cache[key];
}

module.exports = { hashPassword, processUser, getFromCache };
