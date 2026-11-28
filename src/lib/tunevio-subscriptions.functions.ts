import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createStripeClient, type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";
import { validateReturnUrl } from "@/lib/validate-return-url";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlanTrialDays } from "@/lib/trial";
import {
  assertTunevioCheckoutOwnership,
  upsertTunevioSubscription,
} from "@/lib/tunevio-subscription-sync.server";

const CheckoutReturnSchema = z.object({
  sessionId: z.string().regex(/^cs_(live|test)_[A-Za-z0-9]+$/),
  environment: z.enum(["sandbox", "live"]) as z.ZodType<StripeEnv>,
});

export const TUNEVIO_PLANS = {
  listener_premium:     { role: "listener", label: "Premium",      priceCents:  699 },
  listener_fan_premium: { role: "listener", label: "Fan Premium",  priceCents: 1499 },
  listener_student:     { role: "listener", label: "Student",      priceCents:  499 },
  artist_starter:       { role: "artist",   label: "Artist Starter", priceCents:    0 },
  artist_pro:           { role: "artist",   label: "Artist Pro",     priceCents:  999 },
  label_plan:           { role: "artist",   label: "Label Plan",     priceCents: 4999 },
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



export const createTunevioCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CheckoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const plan = TUNEVIO_PLANS[data.planId];
      if (plan.priceCents === 0) {
        return { error: "This plan is free — no checkout needed. Sign up to create your artist profile." };
      }
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.planId], limit: 1 });
      if (!prices?.data?.length) throw new Error(`Price not configured: ${data.planId}`);
      const price = prices.data[0];

      const { resolveBillingCustomer } = await import('@/lib/billing-ownership.server');
      const customerId = await resolveBillingCustomer(stripe, context, data.environment);

      // One free trial per member; fail closed if subscription history cannot be read.
      const { count: priorSubs, error: historyError } = await context.supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId);
      if (historyError) throw historyError;
      const trialEligible = !priorSubs;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_method_collection: "always",
        metadata: {
          kind: "tunevio_subscription",
          userId: context.userId,
          planId: data.planId,
          role: plan.role,
        },
        subscription_data: {
          ...(trialEligible && getPlanTrialDays(data.planId) > 0 && { trial_period_days: getPlanTrialDays(data.planId) }),
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
      const { resolveBillingCustomer } = await import('@/lib/billing-ownership.server');
      const customerId = await resolveBillingCustomer(stripe, context, data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
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

type ConfirmedSubscription = {
  plan_type: string;
  role: string | null;
  status: string;
  price_cents: number;
  current_period_end: string | null;
  renewal_date: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
};

export const confirmTunevioCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CheckoutReturnSchema.parse(input))
  .handler(async ({ data, context }): Promise<
    | { kind: "tunevio_subscription"; subscription: ConfirmedSubscription }
    | { kind: "other_checkout" }
    | { kind: "error"; error: string }
  > => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.status !== "complete") throw new Error("This checkout is not complete yet");
      if (session.mode !== "subscription" || session.metadata?.kind !== "tunevio_subscription") {
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          throw new Error("This payment is still processing");
        }
        return { kind: "other_checkout" };
      }

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      if (!subscriptionId) throw new Error("This checkout has no subscription");
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price.product"],
      });
      assertTunevioCheckoutOwnership(session, subscription, context.userId);

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!customerId) throw new Error("This checkout has no billing customer");
      const { verifyBillingCustomer } = await import("@/lib/billing-ownership.server");
      await verifyBillingCustomer(stripe, context, customerId, data.environment);

      // The session, subscription, customer and signed-in account have all been
      // verified. Only now may the privileged writer activate the plan.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const saved = await upsertTunevioSubscription(supabaseAdmin, subscription, data.environment);
      return {
        kind: "tunevio_subscription",
        subscription: {
          plan_type: saved.plan_type,
          role: saved.role,
          status: saved.status,
          price_cents: saved.price_cents,
          current_period_end: saved.current_period_end,
          renewal_date: saved.renewal_date,
          cancel_at_period_end: saved.cancel_at_period_end,
          stripe_subscription_id: saved.stripe_subscription_id,
        },
      };
    } catch (error) {
      const message = getStripeErrorMessage(error);
      const safeMessage = /not complete yet|still processing|no subscription|no billing customer|could not be verified/i.test(message)
        ? message
        : "We could not verify this checkout for the signed-in account";
      return { kind: "error", error: safeMessage };
    }
  });