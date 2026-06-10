import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createStripeClient, type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";
import { validateReturnUrl } from "@/lib/validate-return-url";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BoostSchema = z.object({
  returnUrl: z.string().url().refine((u) => {
    try { validateReturnUrl(u); return true; } catch { return false; }
  }, { message: "returnUrl must be on the application domain" }),
  environment: z.enum(["sandbox", "live"]) as z.ZodType<StripeEnv>,
});

async function resolveCustomerId(
  stripe: ReturnType<typeof createStripeClient>,
  email: string | undefined,
  userId: string,
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (email) {
    const ex = await stripe.customers.list({ email, limit: 1 });
    if (ex.data.length) {
      const c = ex.data[0];
      if (c.metadata?.userId !== userId) {
        await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId } });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(email && { email }),
    metadata: { userId },
  });
  return created.id;
}

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

      const { data: u } = await context.supabase.auth.getUser();
      const email = u.user?.email?.toLowerCase();
      const customerId = await resolveCustomerId(stripe, email, context.userId);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { kind: "play_boost", userId: context.userId, credits: "2" },
        payment_intent_data: {
          description: "BWFPLAY Skip-the-Line Boost (2 credits)",
          metadata: { kind: "play_boost", userId: context.userId, credits: "2" },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

/** $6.99/mo subscription for BWF Artist Membership. */
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

      const { data: u } = await context.supabase.auth.getUser();
      const email = u.user?.email?.toLowerCase();
      const customerId = await resolveCustomerId(stripe, email, context.userId);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { kind: "play_membership", userId: context.userId },
        subscription_data: {
          metadata: { kind: "play_membership", userId: context.userId },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });