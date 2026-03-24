const db = require("./db");

// SQL injection + hardcoded secret + no input validation
const SECRET = "super_secret_123";

function login(username, password) {
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  return db.query(query);
}

function generateToken(userId) {
  return Buffer.from(userId + SECRET).toString("base64");
}

module.exports = { login, generateToken };
