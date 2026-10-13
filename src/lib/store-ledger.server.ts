import { DEFAULT_ARTIST_BPS, computeSplit } from "@/lib/artist-store";
import type { StripeEnv } from "@/lib/stripe.server";

/** Records the sale's earnings once, from the provider's real fee. Safe to call repeatedly. */
export async function recordStoreSale(admin: any, orderId: string, env: StripeEnv): Promise<void> {
  const { data: o } = await admin.from("store_orders")
    .select("id, seller_user_id, status, quantity, unit_price_cents, unit_cost_cents, amount_total_cents, stripe_payment_intent_id, environment")
    .eq("id", orderId).maybeSingle();
  if (!o || o.status !== "paid" || o.environment !== env) return;
  const { data: existing } = await admin.from("store_earnings_ledger").select("id").eq("order_id", o.id).eq("entry_type", "sale").maybeSingle();
  if (existing) return;

  const revenue = o.unit_price_cents * o.quantity;
  let fee = 0;
  if (o.stripe_payment_intent_id) {
    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(env);
      const pi: any = await stripe.paymentIntents.retrieve(o.stripe_payment_intent_id, { expand: ["latest_charge.balance_transaction"] });
      const totalFee = pi?.latest_charge?.balance_transaction?.fee ?? 0;
      const total = o.amount_total_cents || pi?.amount_received || revenue;
      // Only the part of the fee attributable to the merchandise (not tax/shipping).
      fee = total > 0 ? Math.round((totalFee * revenue) / total) : 0;
    } catch (e) {
      console.error("[store-ledger] fee lookup failed", e);
      return; // retry on the next delivery rather than record a wrong fee
    }
  }
  const { data: s } = await admin.from("store_revenue_settings").select("artist_bps").eq("id", 1).maybeSingle();
  const bps = s?.artist_bps ?? DEFAULT_ARTIST_BPS;
  const cost = (o.unit_cost_cents ?? 0) * o.quantity;
  const split = computeSplit({ revenue_cents: revenue, cost_cents: cost, fee_cents: fee, artist_bps: bps });
  await admin.from("store_orders").update({ fee_cents: fee }).eq("id", o.id);
  const { error } = await admin.from("store_earnings_ledger").insert({
    order_id: o.id, seller_user_id: o.seller_user_id, entry_type: "sale", revenue_cents: revenue, cost_cents: cost, fee_cents: fee,
    artist_bps: bps, artist_cents: split.artist_cents, platform_cents: split.platform_cents, environment: env,
  });
  if (error && !String(error.message).includes("duplicate")) console.error("[store-ledger] sale insert failed", error);
}

/** Reverses a sale once (refund, chargeback, cancellation). */
export async function reverseStoreSale(admin: any, orderId: string, reason: string): Promise<void> {
  const { data: sale } = await admin.from("store_earnings_ledger").select("*").eq("order_id", orderId).eq("entry_type", "sale").maybeSingle();
  if (!sale) return;
  const { error } = await admin.from("store_earnings_ledger").insert({
    order_id: orderId, seller_user_id: sale.seller_user_id, entry_type: "reversal", reason,
    revenue_cents: -sale.revenue_cents, cost_cents: -sale.cost_cents, fee_cents: -sale.fee_cents, artist_bps: sale.artist_bps,
    artist_cents: -sale.artist_cents, platform_cents: -sale.platform_cents, environment: sale.environment,
  });
  if (error && !String(error.message).includes("duplicate")) console.error("[store-ledger] reversal failed", error);
}
