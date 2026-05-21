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

export type StripePaidPlan = keyof typeof stripePriceIds;

export function getStripePriceIdForPlan(plan: StripePaidPlan) {
  return stripePriceIds[plan];
}

export function getPlanFromStripePriceId(priceId?: string | null): StripePaidPlan | null {
  if (!priceId) {
    return null;
  }

  if (priceId === stripePriceIds.empresa) {
    return "empresa";
  }

  if (priceId === stripePriceIds.pro) {
    return "pro";
  }

  return null;
}
