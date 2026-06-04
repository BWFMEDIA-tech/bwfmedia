import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  category?: "admin" | "role" | "stream" | "ban" | "payout" | "moderation" | "system";
  targetType?: string | null;
  targetId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Best-effort audit log writer. Never throws — auditing must not break the
 * operation it records.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await (supabaseAdmin as any).from("admin_audit_log").insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      category: entry.category ?? "admin",
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      summary: entry.summary ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    console.error("[audit] failed to write entry", e);
  }
}