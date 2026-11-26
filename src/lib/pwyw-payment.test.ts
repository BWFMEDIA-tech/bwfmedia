import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieveIntent = vi.fn();
vi.mock("./stripe.server", () => ({ createStripeClient: () => ({ paymentIntents: { retrieve: retrieveIntent } }) }));
import { recordPwywCheckoutPaid } from "./pwyw-payment.server";

function admin(purchase: any, rpcResult: { error: null | { message: string } } = { error: null }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return {
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: purchase }) }) }) }) }),
  };
}

beforeEach(() => {
  retrieveIntent.mockReset();
  retrieveIntent.mockResolvedValue({ latest_charge: { balance_transaction: { fee: 31 } } });
});

describe("webhook-only Pay What You Want activation", () => {
  it("ignores unrelated checkout sessions", async () => {
    const sb = admin(null);
    await expect(recordPwywCheckoutPaid(sb, { id: "cs_other", metadata: { kind: "store_order" }, payment_status: "paid" } as any, "live")).resolves.toBe(false);
    expect(sb.rpc).not.toHaveBeenCalled();
  });
  it("does not activate an unpaid session", async () => {
    const sb = admin(null);
    await expect(recordPwywCheckoutPaid(sb, { id: "cs_unpaid", metadata: { kind: "pwyw_purchase" }, payment_status: "unpaid" } as any, "live")).resolves.toBe(false);
    expect(sb.rpc).not.toHaveBeenCalled();
  });
  it("passes actual tax and processing fees to the atomic purchase RPC", async () => {
    const purchase = { id: "purchase1", buyer_user_id: "buyer1", product_id: "product1", amount_cents: 101, status: "pending" };
    const sb = admin(purchase);
    const session = {
      id: "cs_test", payment_status: "paid", payment_intent: "pi_test", amount_total: 110,
      total_details: { amount_tax: 9 }, metadata: { kind: "pwyw_purchase", buyerUserId: "buyer1", productId: "product1" },
    };
    await expect(recordPwywCheckoutPaid(sb, session as any, "live")).resolves.toBe(true);
    expect(sb.rpc).toHaveBeenCalledWith("pwyw_mark_purchase_paid", {
      _session_id: "cs_test", _environment: "live", _payment_intent: "pi_test", _total_collected: 110, _tax: 9, _fee: 31,
    });
  });
  it("fails closed when the verified checkout identity differs", async () => {
    const sb = admin({ id: "purchase1", buyer_user_id: "buyer1", product_id: "product1", amount_cents: 100, status: "pending" });
    await expect(recordPwywCheckoutPaid(sb, { id: "cs_test", payment_status: "paid", payment_intent: "pi_test", metadata: { kind: "pwyw_purchase", buyerUserId: "attacker", productId: "product1" } } as any, "live")).rejects.toThrow("identity mismatch");
    expect(sb.rpc).not.toHaveBeenCalled();
  });
  it("requests a Stripe retry if the purchase insert has not landed yet", async () => {
    const sb = admin(null);
    await expect(recordPwywCheckoutPaid(sb, { id: "cs_race", payment_status: "paid", metadata: { kind: "pwyw_purchase" } } as any, "live")).rejects.toThrow("not ready");
  });
});
