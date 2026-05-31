import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

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
      console.error("[invite] lookup error", { code, error: error.message });
      return { ok: false, reason: "not_found" };
    }
    if (!row) {
      console.warn("[invite] not_found", { code });
      return { ok: false, reason: "not_found" };
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      console.warn("[invite] expired", { code });
      return { ok: false, reason: "expired" };
    }
    if (row.max_uses != null && row.uses >= row.max_uses) {
      console.warn("[invite] exhausted", { code });
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
      console.warn("[invite] no_live_stream", { code });
      return { ok: false, reason: "no_live_stream" };
    }

    const { data: stream } = await client
      .from("streams")
      .select("id, room_name, title, status, mode, host_id")
      .eq("id", streamId)
      .maybeSingle();

    if (!stream) {
      console.warn("[invite] stream_missing", { code, streamId });
      return { ok: false, reason: "not_found" };
    }

    console.log("[invite] opened", { code, streamId, allowed_role: row.allowed_role });
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
  .inputValidator((input) =>
    z
      .object({
        code: codeSchema,
        role: z.enum(["host", "speaker", "listener"]),
        userId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const client = adminClient();
    console.log("[invite] join", { code: data.code, role: data.role, userId: data.userId ?? null });
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