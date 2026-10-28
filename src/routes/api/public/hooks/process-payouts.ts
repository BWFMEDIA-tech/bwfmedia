// @public-endpoint: Caller is verified by a Bearer scheduled-job secret (Vault cron_process_payouts via verify_cron_secret) or the service role key.
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
        // Cron-only endpoint. Verify the existing service key or Vault job secret.
        const authHeader = request.headers.get("Authorization");
        const scheme = authHeader === null
          ? null
          : /^Bearer(?:\s|$)/i.test(authHeader)
            ? "Bearer"
            : /^Basic(?:\s|$)/i.test(authHeader)
              ? "Basic"
              : "other";
        const token = authHeader?.match(/^Bearer[ \t]+(\S+)[ \t]*$/i)?.[1] ?? "";
        const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
        let authorized = Boolean(token && expected && token === expected);
        let reason: "missing_header" | "bad_scheme" | "invalid_token" | "verify_error" =
          authHeader === null ? "missing_header" : scheme !== "Bearer" ? "bad_scheme" : "invalid_token";
        if (token && !authorized) {
          // Redact credentials even if an upstream error unexpectedly echoes input.
          const safeError = (value: unknown) => {
            let text = typeof value === "string" ? value : "Cron secret verification failed";
            for (const secret of [authHeader, token, expected]) {
              if (secret) text = text.split(secret).join("[redacted]");
            }
            return text;
          };
          try {
            const { data, error: verifyError } = await admin().rpc("verify_cron_secret", {
              p_name: "cron_process_payouts",
              p_token: token,
            });
            if (verifyError) {
              reason = "verify_error";
              console.error("[process-payouts] secret verification failed", {
                message: safeError(verifyError.message),
                code: safeError(verifyError.code),
              });
            } else {
              authorized = data === true;
            }
          } catch (error) {
            reason = "verify_error";
            console.error("[process-payouts] secret verification failed", {
              message: safeError(error instanceof Error ? error.message : undefined),
            });
          }
        }
        if (!authorized) {
          console.error("[process-payouts] unauthorized", {
            hasAuthorizationHeader: authHeader !== null,
            scheme,
            reason,
          });
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const db = admin();
        const { count: staleCount, error: staleError } = await db
          .from("payout_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "processing")
          .lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
        const stale_processing = staleError ? null : staleCount ?? 0;
        if (staleError) {
          console.error("[process-payouts] stale processing count failed", { error: staleError.message });
        } else if (stale_processing && stale_processing > 0) {
          console.error("[process-payouts] stale processing payouts need manual review", { count: stale_processing });
        }
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
        let status_update_failed = 0;

        for (const req of queued ?? []) {
          // Mark processing so a concurrent run skips it
          const { data: claimed, error: lockErr } = await db
            .from("payout_requests")
            .update({ status: "processing", updated_at: new Date().toISOString() })
            .eq("id", req.id)
            .eq("status", "queued")
            .select("id");
          if (lockErr || !claimed?.length) continue;

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

            // A completed transfer must never enter the transfer-failure path.
            try {
              const { error: paidError } = await db
                .from("payout_requests")
                .update({
                  status: "paid",
                  stripe_transfer_id: transfer.id,
                  stripe_destination_id: acct.stripe_account_id,
                  processed_at: new Date().toISOString(),
                })
                .eq("id", req.id);
              if (paidError) throw new Error(paidError.message);
            } catch (error) {
              console.error("[process-payouts] transfer succeeded but status update failed", {
                payoutRequestId: req.id,
                transferId: transfer.id,
                error: error instanceof Error ? error.message : "Status update failed",
              });
              status_update_failed++;
              continue;
            }
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
          stale_processing,
          status_update_failed,
        });
      },
    },
  },
});