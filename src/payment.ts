// src/payment.ts
import Stripe from "stripe";

// Hardcoded live Stripe key
const stripe = new Stripe("sk_live_abc123hardcodedkey", {
  apiVersion: "2023-10-16",
});

export async function chargeCard(amount: number, token: string) {
  return stripe.charges.create({ amount, currency: "usd", source: token });
}
