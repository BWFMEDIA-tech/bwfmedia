import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createStripeClient, type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";
import { validateReturnUrl } from "@/lib/validate-return-url";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ARTIST_TRIAL_DAYS } from "@/lib/trial";

const BoostSchema = z.object({
  returnUrl: z.string().url().refine((u) => {
    try { validateReturnUrl(u); return true; } catch { return false; }
  }, { message: "returnUrl must be on the application domain" }),
  environment: z.enum(["sandbox", "live"]) as z.ZodType<StripeEnv>,
});



/** $25 one-time → grants 2 boost credits when webhook fires. */
export const createBoostCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BoostSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: ["play_boost_2pack"], limit: 1 });
      if (!prices.data.length) throw new Error("Boost price not configured");
      const price = prices.data[0];

      const { resolveBillingCustomer } = await import('@/lib/billing-ownership.server');
      const customerId = await resolveBillingCustomer(stripe, context, data.environment);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { kind: "play_boost", userId: context.userId, credits: "2" },
        payment_intent_data: {
          description: "Tunevio Skip-the-Line Boost (2 credits)",
          metadata: { kind: "play_boost", userId: context.userId, credits: "2" },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

/** $9.99/mo subscription for BWF Artist Membership. */
export const createMembershipCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BoostSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({
        lookup_keys: ["bwf_artist_membership_monthly"], limit: 1,
      });
      if (!prices.data.length) throw new Error("Membership price not configured");
      const price = prices.data[0];

      const { resolveBillingCustomer } = await import('@/lib/billing-ownership.server');
      const customerId = await resolveBillingCustomer(stripe, context, data.environment);

      const { count: priorSubs, error: historyError } = await context.supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId);
      if (historyError) throw historyError;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { kind: "play_membership", userId: context.userId },
        payment_method_collection: "always",
        subscription_data: {
          ...(!priorSubs && { trial_period_days: ARTIST_TRIAL_DAYS }),
          metadata: { kind: "play_membership", userId: context.userId },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });