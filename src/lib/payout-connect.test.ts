import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { createPayoutConnectAccount } from "./payout-connect.server";

function fixture() {
  const create = vi.fn(async (_params: Stripe.AccountCreateParams) => ({ id: "acct_created" }));
  const stripe = { accounts: { create } } as unknown as Stripe;
  return { create, stripe };
}

describe("Stripe payout account configuration", () => {
  it("uses the tested Express controller with Stripe collecting payment losses, not legacy type", async () => {
    const { create, stripe } = fixture();
    await createPayoutConnectAccount(stripe, "artist-a", "artist@example.test");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      controller: {
        stripe_dashboard: { type: "express" },
        fees: { payer: "application" },
        losses: { payments: "stripe" },
        requirement_collection: "stripe",
      },
    }));
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("type");
  });

  it("requests the tested card payments and transfers capabilities", async () => {
    const { create, stripe } = fixture();
    await createPayoutConnectAccount(stripe, "artist-a");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    }));
  });

  it("preserves the authenticated owner mapping and email", async () => {
    const { create, stripe } = fixture();
    expect(await createPayoutConnectAccount(stripe, "artist-a", "artist@example.test"))
      .toEqual({ id: "acct_created" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { lovable_user_id: "artist-a" }, email: "artist@example.test",
    }));
  });

  it("omits an unavailable email instead of sending undefined", async () => {
    const { create, stripe } = fixture();
    await createPayoutConnectAccount(stripe, "artist-a");
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("email");
  });
});