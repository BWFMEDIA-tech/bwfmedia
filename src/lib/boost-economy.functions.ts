import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createStripeClient, type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";
import { validateReturnUrl } from "@/lib/validate-return-url";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PACK_ID_RE = /^boost_pack_[a-z0-9_]+$/;

const CheckoutSchema = z.object({
  packId: z.string().regex(PACK_ID_RE, "Invalid pack id"),
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

/** Creates an embedded Stripe Checkout session for a boost credit pack. */
export const createBoostPackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CheckoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      // Look up the pack in DB to get credits count & validate it's active.
      const { data: pack, error: packErr } = await context.supabase
        .from("boost_credit_packs")
        .select("id, name, credits, price_cents, active")
        .eq("id", data.packId)
        .eq("active", true)
        .maybeSingle();
      if (packErr || !pack) return { error: "Pack not found" };

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.packId], limit: 1 });
      if (!prices.data.length) return { error: "Price not configured in Stripe" };
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
        metadata: {
          kind: "boost_credit_pack",
          userId: context.userId,
          packId: data.packId,
          credits: String(pack.credits),
        },
        payment_intent_data: {
          description: `BWF Network — ${pack.name}`,
          metadata: {
            kind: "boost_credit_pack",
            userId: context.userId,
            packId: data.packId,
            credits: String(pack.credits),
          },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

const SpendSchema = z.object({
  trackId: z.string().uuid(),
  weight: z.number().int().min(1).max(100).default(1),
});

/** Spend boost credits on a play track. Atomic in DB. */
export const spendBoostOnTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SpendSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ newBalance: number; spendId: string } | { error: string }> => {
    const { data: rows, error } = await context.supabase.rpc("spend_boost_on_track", {
      _track_id: data.trackId,
      _weight: data.weight,
    });
    if (error) return { error: error.message };
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { newBalance: row?.new_balance ?? 0, spendId: row?.spend_id ?? "" };
  });

/** Get the signed-in user's current balance + recent ledger entries. */
export const getBoostWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: bal }, { data: ledger }, { data: packs }] = await Promise.all([
      context.supabase
        .from("play_boost_credits")
        .select("credits, updated_at")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("boost_credit_ledger")
        .select("id, delta, reason, reference_id, balance_after, metadata, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("boost_credit_packs")
        .select("id, name, credits, price_cents, currency, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

    return {
      balance: bal?.credits ?? 0,
      updatedAt: bal?.updated_at ?? null,
      ledger: ledger ?? [],
      packs: packs ?? [],
    };
  });