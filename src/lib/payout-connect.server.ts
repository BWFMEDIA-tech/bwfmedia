import type Stripe from "stripe";

/** Create only new accounts; existing account IDs stay in the onboarding flow. */
export function createPayoutConnectAccount(
  stripe: Stripe,
  userId: string,
  email?: string,
) {
  return stripe.accounts.create({
    ...(email ? { email } : {}),
    controller: {
      stripe_dashboard: { type: "express" },
      fees: { payer: "application" },
      losses: { payments: "stripe" },
      requirement_collection: "stripe",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { lovable_user_id: userId },
  });
}