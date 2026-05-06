import Stripe from "stripe";

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
}

export const stripePriceIds = {
  pro: process.env.STRIPE_PRICE_ID_PRO || "",
  empresa: process.env.STRIPE_PRICE_ID_EMPRESA || "",
};
