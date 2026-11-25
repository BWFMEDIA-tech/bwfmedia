import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";
import { validateReturnUrl } from "@/lib/validate-return-url";
import { ARTIST_TRIAL_DAYS } from "@/lib/trial";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

export const createArtistTrialCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    returnUrl: string;
    environment: StripeEnv;
    customerEmail?: string;
  }) => {
    const safeReturnUrl = validateReturnUrl(data.returnUrl);
    return { environment: data.environment, returnUrl: safeReturnUrl };
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;

      // Block re-subscribe if already trialing/active.
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .eq("price_id", "artist_monthly")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const end = existing.current_period_end ? new Date(existing.current_period_end as string) : null;
        const stillActive =
          ["trialing", "active", "past_due"].includes(existing.status as string) &&
          (!end || end > new Date());
        if (stillActive) {
          return { error: "You already have an active Artist Membership." };
        }
      }

      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: ["artist_monthly"] });
      if (!prices?.data?.length) throw new Error("Artist membership price not found");
      const stripePrice = prices.data[0];

      const { resolveBillingCustomer } = await import('@/lib/billing-ownership.server');
      const customerId = await resolveBillingCustomer(stripe, context, data.environment);

      const { count: priorSubs, error: historyError } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (historyError) throw historyError;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_method_collection: "always",
        subscription_data: {
          ...(!priorSubs && ARTIST_TRIAL_DAYS > 0 && { trial_period_days: ARTIST_TRIAL_DAYS }),
          metadata: { userId, kind: "artist_membership" },
        },
        metadata: { userId, kind: "artist_membership" },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createArtistPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => {
    const safeReturnUrl = validateReturnUrl(data.returnUrl);
    return { environment: data.environment, returnUrl: safeReturnUrl };
  })
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { supabase, userId } = context;
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("price_id", "artist_monthly")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError || !sub?.stripe_customer_id) {
      return { error: "No active membership found" };
    }
    try {
      const stripe = createStripeClient(data.environment);
      const { verifyBillingCustomer } = await import('@/lib/billing-ownership.server');
      await verifyBillingCustomer(stripe, context, sub.stripe_customer_id, data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id as string,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type ArtistSubscriptionRow = {
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
} | null;

export const getMyArtistSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ subscription: ArtistSubscriptionRow }> => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, trial_end, cancel_at_period_end, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .eq("price_id", "artist_monthly")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { subscription: (row as ArtistSubscriptionRow) ?? null };
  });