import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// @public-endpoint: one-use, database-generated job capability; never a public API key.
export const Route = createFileRoute("/api/public/hooks/push-notification")({ server: { handlers: {
  POST: async ({ request }) => {
    const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
    if (!z.string().uuid().safeParse(token).success) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const seed = process.env['WEB_PUSH_VAPID_SEED'];
    if (!seed) return Response.json({ error: "Delivery not configured" }, { status: 503 });
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await db.from("notification_push_jobs").update({ status: "processing" }).eq("id", token ?? "").eq("status", "pending").gt("created_at", new Date(Date.now() - 3600000).toISOString()).select("notification_id").maybeSingle();
    if (error || !job) return Response.json({ error: "Unauthorized" }, { status: 401 });
    try {
      const { deliverInboxPush } = await import("@/lib/web-push.server");
      const result = await deliverInboxPush(job.notification_id, seed);
      await db.from("notification_push_jobs").update({ status: result.failed ? "failed" : "sent" }).eq("id", token ?? "");
      return Response.json({ ok: true });
    } catch {
      await db.from("notification_push_jobs").update({ status: "failed" }).eq("id", token ?? "");
      return Response.json({ error: "Delivery failed" }, { status: 500 });
    }
  },
} } });