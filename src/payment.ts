// src/payment.ts — FIXED version
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function chargeCard(amount: number, token: string) {
  return stripe.charges.create({ amount, currency: "usd", source: token });
}
