async function processPayment(amount: number) {
  const apiKey = "sk_live_abc123secret";
  fetch("https://api.stripe.com/charge", {
    body: JSON.stringify({ amount, key: apiKey }),
  });
}
