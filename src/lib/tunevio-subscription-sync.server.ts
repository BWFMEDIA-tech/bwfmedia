import type { StripeEnv } from "@/lib/stripe.server";

export const TUNEVIO_PLAN_META: Record<string, { role: "listener" | "artist"; priceCents: number }> = {
  listener_premium: { role: "listener", priceCents: 699 },
  listener_fan_premium: { role: "listener", priceCents: 1499 },
  listener_student: { role: "listener", priceCents: 499 },
  artist_starter: { role: "artist", priceCents: 0 },
  artist_pro: { role: "artist", priceCents: 999 },
  label_plan: { role: "artist", priceCents: 4999 },
};

function stripeTimestamp(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
}

export function tunevioSubscriptionRecord(sub: any, environment: StripeEnv) {
  const userId = sub?.metadata?.userId as string | undefined;
  const item = sub?.items?.data?.[0];
  const lookupKey = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || sub?.metadata?.planId;
  const plan = typeof lookupKey === "string" ? TUNEVIO_PLAN_META[lookupKey] : undefined;
  if (!userId || !plan || !lookupKey) throw new Error("Subscription plan or account metadata is incomplete");

  const periodStart = item?.current_period_start ?? sub?.current_period_start;
  const periodEnd = item?.current_period_end ?? sub?.current_period_end;
  const start = sub?.start_date ?? sub?.created ?? periodStart;
  const productId = typeof item?.price?.product === "string"
    ? item.price.product
    : item?.price?.product?.id;

  return {
    user_id: userId,
    stripe_subscription_id: sub.id as string,
    stripe_customer_id: sub.customer as string,
    product_id: productId ?? `tunevio_${lookupKey}`,
    price_id: lookupKey,
    plan_type: lookupKey,
    role: (sub?.metadata?.role as string | undefined) || plan.role,
    price_cents: plan.priceCents,
    billing_interval: item?.price?.recurring?.interval ?? null,
    start_date: stripeTimestamp(start),
    renewal_date: stripeTimestamp(periodEnd),
    status: (sub.status ?? "active") as string,
    current_period_start: stripeTimestamp(periodStart),
    current_period_end: stripeTimestamp(periodEnd),
    trial_end: stripeTimestamp(sub.trial_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    environment,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertTunevioSubscription(supabase: any, sub: any, environment: StripeEnv) {
  const record = tunevioSubscriptionRecord(sub, environment);
  const { error } = await supabase.from("subscriptions").upsert(record, {
    onConflict: "stripe_subscription_id",
  });
  if (error) throw error;
  return record;
}

export async function markTunevioSubscriptionDeleted(supabase: any, sub: any, environment: StripeEnv) {
  const periodEnd = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  const { error } = await supabase.from("subscriptions").update({
    status: "canceled",
    current_period_end: stripeTimestamp(periodEnd),
    renewal_date: stripeTimestamp(periodEnd),
    cancel_at_period_end: !!sub?.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", sub.id).eq("environment", environment);
  if (error) throw error;
}

/** Only the account embedded by our server-side checkout may activate its own verified purchase. */
export function assertTunevioCheckoutOwnership(session: any, sub: any, userId: string) {
  const subscriptionId = typeof session?.subscription === "string"
    ? session.subscription
    : session?.subscription?.id;
  const sessionCustomer = typeof session?.customer === "string"
    ? session.customer
    : session?.customer?.id;
  const subscriptionCustomer = typeof sub?.customer === "string"
    ? sub.customer
    : sub?.customer?.id;
  const sessionMeta = session?.metadata ?? {};
  const subscriptionMeta = sub?.metadata ?? {};

  if (
    session?.mode !== "subscription"
    || session?.status !== "complete"
    || sessionMeta.kind !== "tunevio_subscription"
    || sessionMeta.userId !== userId
    || subscriptionMeta.kind !== "tunevio_subscription"
    || subscriptionMeta.userId !== userId
    || sessionMeta.planId !== subscriptionMeta.planId
    || !TUNEVIO_PLAN_META[subscriptionMeta.planId]
    || !subscriptionId
    || subscriptionId !== sub?.id
    || !sessionCustomer
    || sessionCustomer !== subscriptionCustomer
    || (session?.payment_status !== "paid" && sub?.status !== "trialing")
  ) {
    throw new Error("This checkout could not be verified for your account");
  }
}
