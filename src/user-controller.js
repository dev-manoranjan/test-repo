// src/user-controller.js
const { exec } = require("child_process");
const db = require("./db");

function getUser(req, res) {
  // SQL injection: untrusted input concatenated straight into the query
  const query = "SELECT * FROM users WHERE id = '" + req.query.id + "'";
  db.query(query, (err, rows) => res.json(rows));
}

function pingHost(req, res) {
  // Command injection: untrusted input passed to a shell
  exec("ping -c 1 " + req.query.host, (err, stdout) => res.send(stdout));
}

// Hardcoded credential (weak placeholder, not a real provider key)
const DB_PASSWORD = "password123";

module.exports = { getUser, pingHost, DB_PASSWORD };
