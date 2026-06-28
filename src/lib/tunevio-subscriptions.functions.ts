import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createStripeClient, type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";
import { validateReturnUrl } from "@/lib/validate-return-url";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TUNEVIO_PLANS = {
  listener_premium:     { role: "listener", label: "Premium",      priceCents:  999 },
  listener_fan_premium: { role: "listener", label: "Fan Premium",  priceCents: 1499 },
  listener_student:     { role: "listener", label: "Student",      priceCents:  499 },
  artist_starter:       { role: "artist",   label: "Artist Starter", priceCents:  999 },
  artist_pro:           { role: "artist",   label: "Artist Pro",     priceCents: 1999 },
  label_plan:           { role: "artist",   label: "Label Plan",     priceCents: 9900 },
} as const;

export type TunevioPlanId = keyof typeof TUNEVIO_PLANS;

const PlanIds = Object.keys(TUNEVIO_PLANS) as [TunevioPlanId, ...TunevioPlanId[]];

const CheckoutSchema = z.object({
  planId: z.enum(PlanIds),
  returnUrl: z.string().url().refine((u) => {
    try { validateReturnUrl(u); return true; } catch { return false; }
  }, { message: "returnUrl must be on the application domain" }),
  environment: z.enum(["sandbox", "live"]) as z.ZodType<StripeEnv>,
});

const PortalSchema = z.object({
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

export const createTunevioCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CheckoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const plan = TUNEVIO_PLANS[data.planId];
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.planId], limit: 1 });
      if (!prices.data.length) throw new Error(`Price not configured: ${data.planId}`);
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
        metadata: {
          kind: "tunevio_subscription",
          userId: context.userId,
          planId: data.planId,
          role: plan.role,
        },
        subscription_data: {
          metadata: {
            kind: "tunevio_subscription",
            userId: context.userId,
            planId: data.planId,
            role: plan.role,
          },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

export const createTunevioPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PortalSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    try {
      const { data: sub, error } = await context.supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", context.userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !sub?.stripe_customer_id) {
        return { error: "No subscription found" };
      }
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id as string,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

export const getMyTunevioSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { environment: StripeEnv }) => input)
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("plan_type, role, status, price_cents, current_period_end, renewal_date, cancel_at_period_end, stripe_subscription_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return sub ?? null;
  });