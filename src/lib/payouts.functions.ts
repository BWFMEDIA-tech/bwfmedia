import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIN_PAYOUT_CENTS = 2500; // $25 minimum

type StripeEnv = "sandbox" | "live";
function resolveEnv(): StripeEnv {
  return process.env.STRIPE_LIVE_API_KEY ? "live" : "sandbox";
}

/**
 * Returns the creator's payout overview: connect account state, balance breakdown,
 * and recent payout history.
 */
export const getPayoutOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const env = resolveEnv();

    const [accountRes, balanceRes, historyRes] = await Promise.all([
      supabase
        .from("payout_accounts")
        .select(
          "charges_enabled, payouts_enabled, details_submitted, country, default_currency, requirements, updated_at, auto_payout_enabled, minimum_payout_cents",
        )
        .eq("user_id", userId)
        .eq("environment", env)
        .maybeSingle(),
      supabase.rpc("get_creator_balance_cents", { _user_id: userId }),
      supabase
        .from("payout_requests")
        .select(
          "id, amount_cents, currency, status, failure_reason, requested_at, processed_at, stripe_transfer_id",
        )
        .eq("user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(25),
    ]);

    const balanceRow = Array.isArray(balanceRes.data)
      ? balanceRes.data[0]
      : balanceRes.data;

    return {
      environment: env,
      minPayoutCents: MIN_PAYOUT_CENTS,
      account: accountRes.data ?? null,
      balance: {
        earned_cents: Number(balanceRow?.earned_cents ?? 0),
        tips_cents: Number(balanceRow?.tips_cents ?? 0),
        merch_cents: Number(balanceRow?.merch_cents ?? 0),
        paid_out_cents: Number(balanceRow?.paid_out_cents ?? 0),
        pending_cents: Number(balanceRow?.pending_cents ?? 0),
        available_cents: Number(balanceRow?.available_cents ?? 0),
      },
      history: historyRes.data ?? [],
    };
  });

/**
 * Create (or reuse) the user's Stripe Connect Express account and return an
 * onboarding URL the user can visit to finish KYC + payout setup.
 */
export const startConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; refreshUrl: string }) => data)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { supabase, userId, claims } = context as any;
    const env = resolveEnv();
    const { createStripeClient, getStripeErrorMessage } = await import(
      "@/lib/stripe.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const stripe = createStripeClient(env);

      // Look up or create the connect account (admin-only column read)
      const { data: existing } = await supabaseAdmin
        .from("payout_accounts")
        .select("stripe_account_id")
        .eq("user_id", userId)
        .eq("environment", env)
        .maybeSingle();

      let accountId = existing?.stripe_account_id as string | undefined;
      if (!accountId) {
        const email = (claims?.email as string | undefined) ?? undefined;
        const acct = await stripe.accounts.create({
          type: "express",
          email,
          capabilities: {
            transfers: { requested: true },
          },
          metadata: { lovable_user_id: userId },
        });
        accountId = acct.id;
        await supabaseAdmin.from("payout_accounts").insert({
          user_id: userId,
          environment: env,
          stripe_account_id: accountId,
          country: acct.country ?? null,
          default_currency: acct.default_currency ?? "usd",
          charges_enabled: !!acct.charges_enabled,
          payouts_enabled: !!acct.payouts_enabled,
          details_submitted: !!acct.details_submitted,
          requirements: (acct.requirements ?? {}) as any,
        });
      }

      const link = await stripe.accountLinks.create({
        account: accountId!,
        type: "account_onboarding",
        return_url: data.returnUrl,
        refresh_url: data.refreshUrl,
      });
      return { url: link.url };
    } catch (error) {
      console.error("[payouts] onboarding failed", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Re-sync the connect account status from Stripe (called after returning from onboarding).
 */
export const refreshConnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const env = resolveEnv();
    const { createStripeClient, getStripeErrorMessage } = await import(
      "@/lib/stripe.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("payout_accounts")
      .select("stripe_account_id")
      .eq("user_id", userId)
      .eq("environment", env)
      .maybeSingle();
    if (!row?.stripe_account_id) return { error: "No payout account yet" };

    try {
      const stripe = createStripeClient(env);
      const acct = await stripe.accounts.retrieve(row.stripe_account_id as string);
      await supabaseAdmin
        .from("payout_accounts")
        .update({
          country: acct.country ?? null,
          default_currency: acct.default_currency ?? "usd",
          charges_enabled: !!acct.charges_enabled,
          payouts_enabled: !!acct.payouts_enabled,
          details_submitted: !!acct.details_submitted,
          requirements: (acct.requirements ?? {}) as any,
        })
        .eq("stripe_account_id", row.stripe_account_id as string);
      return { ok: true };
    } catch (error) {
      console.error("[payouts] refresh failed", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Queue a payout for the creator's available balance. A cron worker picks
 * 'queued' rows and creates the Stripe transfer.
 */
export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; amount_cents: number } | { error: string }> => {
    const { supabase, userId } = context;
    const env = resolveEnv();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: acct } = await supabase
      .from("payout_accounts")
      .select("id, payouts_enabled, default_currency")
      .eq("user_id", userId)
      .eq("environment", env)
      .maybeSingle();
    if (!acct) return { error: "Set up your payout account first." };
    if (!acct.payouts_enabled)
      return { error: "Your payout account isn't approved yet. Finish onboarding." };

    const { data: bal } = await supabase.rpc("get_creator_balance_cents", {
      _user_id: userId,
    });
    const row = Array.isArray(bal) ? bal[0] : bal;
    const available = Number(row?.available_cents ?? 0);
    if (available < MIN_PAYOUT_CENTS) {
      return {
        error: `Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)}. You have $${(available / 100).toFixed(2)} available.`,
      };
    }

    const { error: insErr } = await supabaseAdmin.from("payout_requests").insert({
      user_id: userId,
      payout_account_id: acct.id,
      environment: env,
      amount_cents: available,
      currency: (acct.default_currency as string) ?? "usd",
      status: "queued",
    });
    if (insErr) return { error: insErr.message };
    return { ok: true, amount_cents: available };
  });

/* =========================================================
 * Phase 3.3–3.5: Royalty earnings + auto-payout
 * ========================================================= */

/** Live royalty earnings summary for the signed-in artist. */
export const getMyRoyaltyEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [summaryRes, monthsRes] = await Promise.all([
      supabase.rpc("get_artist_earnings_summary", { _artist_id: userId }),
      supabase
        .from("artist_royalties")
        .select("month, weighted_streams, raw_streams, share_pct, payout_amount_cents, status, paid_at")
        .eq("artist_id", userId)
        .order("month", { ascending: false })
        .limit(12),
    ]);
    return {
      summary: summaryRes.data ?? null,
      months: monthsRes.data ?? [],
    };
  });

/** Toggle the artist's monthly auto-payout preference. */
export const setAutoPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean; minimumPayoutCents?: number }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const env = resolveEnv();
    const min = Math.max(
      MIN_PAYOUT_CENTS,
      Math.floor(Number(data.minimumPayoutCents ?? MIN_PAYOUT_CENTS) || MIN_PAYOUT_CENTS),
    );
    const { error } = await supabase
      .from("payout_accounts")
      .update({ auto_payout_enabled: !!data.enabled, minimum_payout_cents: min })
      .eq("user_id", userId)
      .eq("environment", env);
    if (error) return { error: error.message };
    return { ok: true };
  });

/** Queue a payout for the artist's approved royalty balance. */
export const requestRoyaltyPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; amount_cents: number } | { error: string }> => {
    const { supabase, userId } = context;
    const env = resolveEnv();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: acct } = await supabase
      .from("payout_accounts")
      .select("id, payouts_enabled, default_currency, minimum_payout_cents")
      .eq("user_id", userId)
      .eq("environment", env)
      .maybeSingle();
    if (!acct) return { error: "Set up your payout account first." };
    if (!acct.payouts_enabled)
      return { error: "Your payout account isn't approved yet. Finish onboarding." };

    const { data: summary } = await supabase.rpc("get_artist_earnings_summary", {
      _artist_id: userId,
    });
    const available = Number((summary as any)?.available_cents ?? 0);
    const minimum = Number(acct.minimum_payout_cents ?? MIN_PAYOUT_CENTS);
    if (available < minimum) {
      return {
        error: `Minimum payout is $${(minimum / 100).toFixed(2)}. You have $${(available / 100).toFixed(2)} available.`,
      };
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("payout_requests")
      .insert({
        user_id: userId,
        payout_account_id: acct.id,
        environment: env,
        amount_cents: available,
        currency: (acct.default_currency as string) ?? "usd",
        status: "queued",
        metadata: { source: "royalty" } as any,
      })
      .select("id")
      .maybeSingle();
    if (insErr) return { error: insErr.message };

    // Link approved royalties to this request so the cron knows what's settling.
    if (inserted?.id) {
      await supabaseAdmin
        .from("artist_royalties")
        .update({ payout_request_id: inserted.id })
        .eq("artist_id", userId)
        .eq("status", "approved")
        .is("payout_request_id", null);
    }
    return { ok: true, amount_cents: available };
  });

/** Admin: recompute weighted-stream royalties for a given month. */
export const runRoyaltyCalculation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { month?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("calculate_artist_royalties", {
      _month: data?.month ?? undefined,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      artists_paid: Number((row as any)?.artists_paid ?? 0),
      total_payout_cents: Number((row as any)?.total_payout_cents ?? 0),
    };
  });