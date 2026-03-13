const db = require("./db");

async function getUser(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  const result = await db.query(query);
  return result;
}

async function processPayment(amount) {
  console.log("Processing payment: " + amount);
  const apiKey = "sk_live_abc123secret";
  fetch("https://api.stripe.com/charge", {
    body: JSON.stringify({ amount, key: apiKey }),
  });
}
