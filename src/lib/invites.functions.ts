import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const codeSchema = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);

function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export type ResolvedInvite =
  | {
      ok: true;
      code: string;
      allowed_role: "host" | "speaker" | "listener";
      stream: {
        id: string;
        room_name: string;
        title: string;
        status: string;
        mode: string;
        host_id: string;
      };
      expires_at: string | null;
    }
  | { ok: false; reason: "not_found" | "expired" | "exhausted" | "no_live_stream" };

/** Public — validate an invite code and resolve its target stream. */
export const resolveInvite = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: codeSchema }).parse(input))
  .handler(async ({ data }): Promise<ResolvedInvite> => {
    const code = data.code.toLowerCase();
    const client = adminClient();

    const { data: row, error } = await client
      .from("invite_codes")
      .select("code, stream_id, allowed_role, expires_at, uses, max_uses")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("[invite] lookup error", { error: error.message });
      return { ok: false, reason: "not_found" };
    }
    if (!row) {
      console.warn("[invite] not_found");
      return { ok: false, reason: "not_found" };
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      console.warn("[invite] expired");
      return { ok: false, reason: "expired" };
    }
    if (row.max_uses != null && row.uses >= row.max_uses) {
      console.warn("[invite] exhausted");
      return { ok: false, reason: "exhausted" };
    }

    // Resolve the target stream. If stream_id is set, use it. Otherwise
    // (e.g. the well-known `bwf-host` code) pick the most recent live stream.
    let streamId = row.stream_id as string | null;
    if (!streamId) {
      const { data: live } = await client
        .from("streams")
        .select("id")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      streamId = live?.id ?? null;
    }
    if (!streamId) {
      console.warn("[invite] no_live_stream");
      return { ok: false, reason: "no_live_stream" };
    }

    const { data: stream } = await client
      .from("streams")
      .select("id, room_name, title, status, mode, host_id")
      .eq("id", streamId)
      .maybeSingle();

    if (!stream) {
      console.warn("[invite] stream_missing", { streamId });
      return { ok: false, reason: "not_found" };
    }

    console.log("[invite] opened", { streamId, allowed_role: row.allowed_role });
    return {
      ok: true,
      code: row.code,
      allowed_role: row.allowed_role as "host" | "speaker" | "listener",
      stream: stream as any,
      expires_at: row.expires_at,
    };
  });

/** Track invite consumption. Fire-and-forget from the client. */
export const recordInviteJoin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        code: codeSchema,
        role: z.enum(["host", "speaker", "listener"]),
        userId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const client = adminClient();
    console.log("[invite] join", { role: data.role });
    // Atomic increment via RPC would be nicer; quick read-modify-write is fine
    // for low-contention invite codes.
    const { data: row } = await client
      .from("invite_codes")
      .select("uses")
      .eq("code", data.code)
      .maybeSingle();
    if (row) {
      await client
        .from("invite_codes")
        .update({ uses: (row.uses ?? 0) + 1 })
        .eq("code", data.code);
    }
    return { ok: true };
  });
const ROLE_RANK = { listener: 0, speaker: 1, host: 2 } as const;

/**
 * Place the signed-in invitee on stage with the role their invite grants.
 * Runs server-side because stage RLS only lets the stream owner promote people;
 * the invite code is re-validated here so callers cannot self-promote.
 */
export const joinStageFromInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ code: codeSchema, streamId: z.string().uuid(), role: z.enum(["host", "speaker", "listener"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const client = adminClient();
    const { data: row } = await client
      .from("invite_codes")
      .select("stream_id, allowed_role, expires_at")
      .eq("code", data.code.toLowerCase())
      .maybeSingle();
    if (!row) throw new Error("Invite not found");
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) throw new Error("Invite expired");
    if (row.stream_id && row.stream_id !== data.streamId) throw new Error("Invite is for a different live");
    const allowed = (row.allowed_role ?? "listener") as keyof typeof ROLE_RANK;
    if (ROLE_RANK[data.role] > ROLE_RANK[allowed]) throw new Error("Invite does not allow this role");

    const { data: stream } = await client
      .from("streams")
      .select("id, status, mode")
      .eq("id", data.streamId)
      .maybeSingle();
    if (!stream || stream.status !== "live" || stream.mode !== "stage") throw new Error("Live is not available");

    const { error } = await client
      .from("stage_participants")
      .upsert(
        { stream_id: data.streamId, user_id: context.userId, stage_role: data.role },
        { onConflict: "stream_id,user_id" },
      );
    if (error) throw new Error("Could not join the stage");
    return { ok: true };
  });

/** Stream owner only — create a real guest invite for their own live. */
export const createStreamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: stream } = await context.supabase
      .from("streams").select("id, host_id, status").eq("id", data.streamId).maybeSingle();
    if (!stream || stream.host_id !== context.userId) throw new Error("Only the host can invite guests");
    if (stream.status !== "live") throw new Error("This live has ended");
    const code = `g-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const { error } = await adminClient().from("invite_codes").insert({
      code, stream_id: stream.id, allowed_role: "speaker", created_by: context.userId,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
    if (error) throw new Error("Could not create invite");
    return { code };
  });
