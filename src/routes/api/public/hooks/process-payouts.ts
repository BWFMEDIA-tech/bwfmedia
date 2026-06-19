import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

let _admin: any = null;
function admin() {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _admin;
}

/**
 * Cron worker: drains queued payout_requests by creating Stripe transfers
 * to each creator's connected account. Idempotent via a per-row idempotency key.
 */
export const Route = createFileRoute("/api/public/hooks/process-payouts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Cron-only endpoint. Require the service role key as a Bearer
        // token so unauthenticated attackers cannot trigger Stripe transfers.
        const authHeader = request.headers.get("Authorization") ?? "";
        const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (
          !expected ||
          !authHeader.startsWith("Bearer ") ||
          authHeader.slice(7) !== expected
        ) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const db = admin();
        const { data: queued, error } = await db
          .from("payout_requests")
          .select(
            "id, user_id, payout_account_id, amount_cents, currency, environment",
          )
          .eq("status", "queued")
          .order("requested_at", { ascending: true })
          .limit(25);
        if (error) {
          console.error("[process-payouts] read failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        let processed = 0;
        let failed = 0;

        for (const req of queued ?? []) {
          // Mark processing so a concurrent run skips it
          const { error: lockErr } = await db
            .from("payout_requests")
            .update({ status: "processing", updated_at: new Date().toISOString() })
            .eq("id", req.id)
            .eq("status", "queued");
          if (lockErr) continue;

          const { data: acct } = await db
            .from("payout_accounts")
            .select("stripe_account_id, payouts_enabled")
            .eq("id", req.payout_account_id)
            .maybeSingle();
          if (!acct?.stripe_account_id || !acct.payouts_enabled) {
            await db
              .from("payout_requests")
              .update({
                status: "failed",
                failure_reason: "Connect account not ready",
                processed_at: new Date().toISOString(),
              })
              .eq("id", req.id);
            failed++;
            continue;
          }

          try {
            const env: StripeEnv = req.environment === "live" ? "live" : "sandbox";
            const stripe = createStripeClient(env);
            const transfer = await stripe.transfers.create(
              {
                amount: req.amount_cents,
                currency: (req.currency as string) ?? "usd",
                destination: acct.stripe_account_id as string,
                metadata: { payout_request_id: req.id, user_id: req.user_id },
              },
              { idempotencyKey: `payout_${req.id}` },
            );

            await db
              .from("payout_requests")
              .update({
                status: "paid",
                stripe_transfer_id: transfer.id,
                stripe_destination_id: acct.stripe_account_id,
                processed_at: new Date().toISOString(),
              })
              .eq("id", req.id);
            processed++;
          } catch (e) {
            const msg = getStripeErrorMessage(e);
            console.error("[process-payouts] transfer failed", req.id, msg);
            await db
              .from("payout_requests")
              .update({
                status: "failed",
                failure_reason: msg,
                processed_at: new Date().toISOString(),
              })
              .eq("id", req.id);
            failed++;
          }
        }

        return Response.json({
          ok: true,
          considered: queued?.length ?? 0,
          processed,
          failed,
        });
      },
    },
  },
});