import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteAccountInput, financialRetentionUntil } from "./account-deletion";
import { z } from "zod";

const deletionPlan = z.object({
  storage: z.array(z.object({ bucket: z.string(), path: z.string() })),
  retainUntil: z.string(),
});

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteAccountInput.parse(input))
  .handler(async ({ context }): Promise<{ deleted: true; retainUntil: string } | { error: string }> => {
    // The target comes exclusively from the verified bearer, never request input.
    const userId = context.userId;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    try {
      const [subscriptions, membership] = await Promise.all([
        db.from("subscriptions").select("stripe_subscription_id, environment, status").eq("user_id", userId),
        db.from("play_memberships").select("stripe_subscription_id, status").eq("user_id", userId),
      ]);
      if (subscriptions.error || membership.error) throw new Error("Could not check billing. Your account has not been deleted.");
      const pending = (subscriptions.data ?? []).filter((s) => !["canceled", "incomplete_expired"].includes(s.status));
      for (const row of membership.data ?? []) {
        if (row.stripe_subscription_id && !["canceled", "inactive", "incomplete_expired"].includes(row.status) &&
          !pending.some((s) => s.stripe_subscription_id === row.stripe_subscription_id)) {
          // Legacy Play memberships are live Stripe subscriptions.
          pending.push({ stripe_subscription_id: row.stripe_subscription_id, environment: "live", status: row.status });
        }
      }
      for (const sub of pending) {
        if (sub.environment !== "live" && sub.environment !== "sandbox") throw new Error("Billing needs review before deletion. Please retry later.");
        const { createStripeClient } = await import("./stripe.server");
        const stripe = createStripeClient(sub.environment);
        const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        if (!["canceled", "incomplete_expired"].includes(current.status)) {
          await stripe.subscriptions.cancel(current.id, { prorate: false, invoice_now: false });
        }
      }
      // One transaction archives finances, finalizes host earnings and removes personal rows.
      const prepared = await db.rpc("prepare_account_deletion", { _user_id: userId });
      if (prepared.error) throw new Error("Account cleanup could not finish safely. Please retry; financial records are protected.");
      const plan = deletionPlan.parse(prepared.data);
      const buckets = new Map<string, string[]>();
      for (const file of plan.storage) {
        // Defense in depth: never remove anything outside the user's own folder.
        if (!file.path.startsWith(`${userId}/`) || file.path.includes("..")) continue;
        const paths = buckets.get(file.bucket) ?? [];
        paths.push(file.path);
        buckets.set(file.bucket, paths);
      }
      for (const [bucket, paths] of buckets) {
        for (let start = 0; start < paths.length; start += 100) {
          const removed = await db.storage.from(bucket).remove(paths.slice(start, start + 100));
          if (removed.error) throw new Error("Uploaded files could not be removed. Please retry to finish account deletion.");
        }
      }
      const removed = await db.auth.admin.deleteUser(userId);
      if (removed.error) throw new Error("Account access could not be removed. Please retry to finish deletion.");
      // This receipt has no public read policy, no login, and no personal content.
      const completedAt = new Date();
      const retainUntil = financialRetentionUntil(completedAt).toISOString();
      const receipt = await db.from("account_deletion_receipts").update({
        completed_at: completedAt.toISOString(), retain_until: retainUntil, storage_manifest: [],
      }).eq("user_id", userId);
      if (receipt.error) console.error("Account deletion receipt completion failed");
      return { deleted: true, retainUntil };
    } catch (error) {
      // Provider messages can expose private details. Return only our safe cleanup errors.
      const safe = error instanceof Error && /^(Could not check billing|Billing needs review|Account cleanup|Uploaded files|Account access)/.test(error.message);
      return { error: safe && error instanceof Error ? error.message : "Deletion could not finish. Please retry; payment and earnings records remain protected." };
    }
  });