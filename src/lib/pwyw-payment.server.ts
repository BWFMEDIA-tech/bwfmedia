import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe.server";

type AdminClient = any;

export async function recordPwywCheckoutPaid(supabase: AdminClient, session: Stripe.Checkout.Session, environment: "sandbox" | "live"): Promise<boolean> {
  const metadata = session.metadata ?? {};
  if (metadata["kind"] !== "pwyw_purchase" || session.payment_status !== "paid") return false;
  const { data: purchase } = await supabase.from("digital_music_purchases")
    .select("id, buyer_user_id, product_id, amount_cents, status")
    .eq("stripe_session_id", session.id).eq("environment", environment).maybeSingle();
  if (!purchase) {
    // A webhook can beat the local purchase insert. Throw so Stripe retries
    // instead of acknowledging an event that has not activated access.
    throw new Error("Verified music checkout is not ready for activation");
  }
  if (metadata["buyerUserId"] !== purchase.buyer_user_id || metadata["productId"] !== purchase.product_id) {
    throw new Error("Pay What You Want checkout identity mismatch");
  }
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntent) throw new Error("Paid music checkout has no payment intent");
  let feeCents = 0;
  try {
    const stripe = createStripeClient(environment);
    const intent = await stripe.paymentIntents.retrieve(paymentIntent, { expand: ["latest_charge.balance_transaction"] });
    const charge = intent.latest_charge;
    const balanceTransaction = charge && typeof charge !== "string" ? charge.balance_transaction : null;
    if (balanceTransaction && typeof balanceTransaction !== "string") feeCents = balanceTransaction.fee;
  } catch (error) {
    console.error("[pwyw] processing fee lookup failed", error instanceof Error ? error.message : error);
    throw error;
  }
  const taxCents = session.total_details?.amount_tax ?? 0;
  const totalCents = session.amount_total ?? 0;
  const { error } = await supabase.rpc("pwyw_mark_purchase_paid", {
    _session_id: session.id,
    _environment: environment,
    _payment_intent: paymentIntent,
    _total_collected: totalCents,
    _tax: taxCents,
    _fee: feeCents,
  });
  if (error) throw new Error(error.message);
  console.log("[pwyw] purchase activated", { purchaseId: purchase.id, amountCents: purchase.amount_cents, feeCents, taxCents });
  return true;
}

export async function confirmPwywCheckoutForBuyer(
  stripe: Stripe,
  supabase: AdminClient,
  sessionId: string,
  buyerUserId: string,
  environment: "sandbox" | "live",
): Promise<
  | { kind: "other_checkout" }
  | { kind: "pwyw_purchase"; status: "paid"; purchaseId: string; productTitle: string }
  | { kind: "pwyw_purchase"; status: "processing" }
> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.["kind"] !== "pwyw_purchase") return { kind: "other_checkout" };
  const { data: purchase, error } = await supabase.from("digital_music_purchases")
    .select("id, buyer_user_id, product_title, status")
    .eq("stripe_session_id", sessionId).eq("environment", environment).maybeSingle();
  if (error || !purchase || purchase.buyer_user_id !== buyerUserId || session.metadata?.["buyerUserId"] !== buyerUserId) {
    throw new Error("This music checkout could not be verified for the signed-in account");
  }
  if (purchase.status === "paid") return { kind: "pwyw_purchase", status: "paid", purchaseId: purchase.id, productTitle: purchase.product_title };
  if (session.payment_status !== "paid") return { kind: "pwyw_purchase", status: "processing" };
  await recordPwywCheckoutPaid(supabase, session, environment);
  return { kind: "pwyw_purchase", status: "paid", purchaseId: purchase.id, productTitle: purchase.product_title };
}

export async function reversePwywPayment(supabase: AdminClient, paymentIntent: string, environment: "sandbox" | "live", reason: "refund" | "chargeback") {
  const { error } = await supabase.rpc("pwyw_reverse_purchase", { _payment_intent: paymentIntent, _environment: environment, _reason: reason });
  if (error) throw new Error(error.message);
}

export async function markPwywCheckoutIncomplete(supabase: AdminClient, session: Stripe.Checkout.Session, environment: "sandbox" | "live", status: "failed" | "expired") {
  if (session.metadata?.["kind"] !== "pwyw_purchase") return;
  await supabase.from("digital_music_purchases").update({ status }).eq("stripe_session_id", session.id).eq("environment", environment).eq("status", "pending");
}
