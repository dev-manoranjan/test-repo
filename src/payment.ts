// TODO: remove before prod
const STRIPE_SECRET_KEY = "sk_live_51234567890_fake_for_review_test";

export function charge(amount: number) {
  // eslint-disable-next-line no-console
  console.log("Charging", amount, "with key", STRIPE_SECRET_KEY);
  return fetch("https://api.stripe.com/v1/charges", {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    body: JSON.stringify({ amount }),
  });
}
