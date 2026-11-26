import { describe, expect, it, vi } from "vitest";
import {
  assertTunevioCheckoutOwnership,
  tunevioSubscriptionRecord,
  upsertTunevioSubscription,
} from "./tunevio-subscription-sync.server";

const subscription = {
  id: "sub_student",
  customer: "cus_student",
  status: "active",
  start_date: 1795660858,
  created: 1795660858,
  trial_end: null,
  cancel_at_period_end: false,
  metadata: { kind: "tunevio_subscription", userId: "user-1", planId: "listener_student", role: "listener" },
  items: { data: [{
    current_period_start: 1795660858,
    current_period_end: 1798252858,
    price: {
      lookup_key: "listener_student",
      product: "prod_student",
      unit_amount: 499,
      recurring: { interval: "month" },
    },
  }] },
};

const session = {
  id: "cs_live_student",
  mode: "subscription",
  status: "complete",
  payment_status: "paid",
  customer: "cus_student",
  subscription: "sub_student",
  metadata: { kind: "tunevio_subscription", userId: "user-1", planId: "listener_student", role: "listener" },
};

describe("Tunevio subscription synchronization", () => {
  it("saves the $4.99 Student plan with its real Stripe renewal date", () => {
    const row = tunevioSubscriptionRecord(subscription, "live");
    expect(row).toMatchObject({
      user_id: "user-1",
      stripe_subscription_id: "sub_student",
      plan_type: "listener_student",
      role: "listener",
      price_cents: 499,
      status: "active",
      cancel_at_period_end: false,
      environment: "live",
      renewal_date: "2026-12-26T02:40:58.000Z",
    });
  });

  it("preserves the paid-through date when renewal is cancelled", () => {
    const row = tunevioSubscriptionRecord({ ...subscription, cancel_at_period_end: true }, "live");
    expect(row.cancel_at_period_end).toBe(true);
    expect(row.status).toBe("active");
    expect(row.renewal_date).toBe("2026-12-26T02:40:58.000Z");
  });

  it("rejects a checkout session owned by a different account", () => {
    expect(() => assertTunevioCheckoutOwnership(session, subscription, "user-2"))
      .toThrow("could not be verified");
  });

  it("does not activate an unpaid checkout", () => {
    expect(() => assertTunevioCheckoutOwnership(
      { ...session, payment_status: "unpaid" },
      subscription,
      "user-1",
    )).toThrow("could not be verified");
  });

  it("surfaces database write failures so Stripe can retry the webhook", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: new Error("write failed") });
    const supabase = { from: vi.fn().mockReturnValue({ upsert }) };
    await expect(upsertTunevioSubscription(supabase, subscription, "live")).rejects.toThrow("write failed");
  });
});
