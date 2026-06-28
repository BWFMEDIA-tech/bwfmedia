import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createIdempotencyKey, runIdempotent } from "@/lib/idempotency";

async function assertHostOrMod(supabase: any, userId: string, streamId: string) {
  const [{ data: stream }, { data: roles }, { data: sp }] = await Promise.all([
    supabase.from("streams").select("host_id").eq("id", streamId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("stage_participants").select("stage_role")
      .eq("stream_id", streamId).eq("user_id", userId).maybeSingle(),
  ]);
  const isHost = stream?.host_id === userId;
  const isCoHost = sp?.stage_role === "co_host" || sp?.stage_role === "host";
  const isMod = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
  if (!isHost && !isCoHost && !isMod) throw new Error("Not authorized");
  return { isPrimaryHost: isHost, isMod };
}

async function logHostAction(
  supabase: any,
  args: {
    actorId: string;
    action: string;
    streamId: string;
    targetUserId: string;
    previousRole: string | null;
    newRole: string | null;
    summary: string;
  },
) {
  try {
    const { data: actor } = await supabase.auth.getUser();
    // admin_audit_log has no INSERT policy for end users; use service role
    // so audit entries actually persist instead of failing silently.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: args.actorId,
      actor_email: actor?.user?.email ?? null,
      action: args.action,
      category: "stream_host",
      target_type: "stage_participant",
      target_id: args.targetUserId,
      summary: args.summary,
      metadata: {
        stream_id: args.streamId,
        previous_role: args.previousRole,
        new_role: args.newRole,
      },
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}

async function syncLiveKitPublishPermission(
  supabase: any,
  streamId: string,
  targetUserId: string,
  stageRole: "host" | "co_host" | "speaker" | "listener" | "green_room",
  options?: { allowCamera?: boolean },
) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return;

  const { data: stream } = await supabase
    .from("streams")
    .select("room_name")
    .eq("id", streamId)
    .maybeSingle();
  if (!stream?.room_name) return;

  const canPublish = stageRole === "host" || stageRole === "co_host" || stageRole === "speaker";
  // Hosts/co-hosts always keep full A/V. Promoted speakers can be restricted
  // to audio-only when the host promotes them with the camera toggle OFF —
  // they then appear on the audio stage but cannot publish a video tile
  // until the host explicitly grants camera.
  const allowCamera = options?.allowCamera ?? true;
  const serviceUrl = wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  const [{ RoomServiceClient }, { TrackSource }] = await Promise.all([
    import("livekit-server-sdk"),
    import("@livekit/protocol"),
  ]);
  const roomClient = new RoomServiceClient(serviceUrl, apiKey, apiSecret);
  const fullSources = [
    TrackSource.MICROPHONE,
    TrackSource.CAMERA,
    TrackSource.SCREEN_SHARE,
    TrackSource.SCREEN_SHARE_AUDIO,
  ];
  const audioOnlySources = [TrackSource.MICROPHONE];
  try {
    await roomClient.updateParticipant(stream.room_name, targetUserId, undefined, {
      canPublish,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: canPublish
        ? allowCamera
          ? fullSources
          : audioOnlySources
        : [],
    });
  } catch (e: any) {
    if (!/participant.*not.*found|not.*found|404/i.test(String(e?.message ?? e))) {
      console.warn("LiveKit permission sync failed", e);
    }
  }
}

/** Set stream mode (broadcast/stage) and stage lock */
export const updateStreamMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      mode: z.enum(["broadcast", "stage", "play"]).optional(),
      stageLocked: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    const patch: any = {};
    if (data.mode) patch.mode = data.mode;
    if (data.stageLocked !== undefined) patch.stage_locked = data.stageLocked;
    const { error } = await supabase.from("streams").update(patch).eq("id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Viewer raises hand */
export const raiseHand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: stream } = await supabase
      .from("streams").select("stage_locked").eq("id", data.streamId).maybeSingle();
    if (stream?.stage_locked) throw new Error("Stage is locked");
    const { error } = await supabase
      .from("raise_hand_requests")
      .upsert({ stream_id: data.streamId, user_id: userId, status: "pending" }, { onConflict: "stream_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Viewer cancels their own pending raise-hand request. */
export const cancelHand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("raise_hand_requests")
      .update({ status: "cancelled" })
      .eq("stream_id", data.streamId)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Host responds to a raise-hand: accept moves to green_room or speaker, decline rejects */
export const respondHand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      requestId: z.string().uuid(),
      action: z.enum(["accept_green_room", "accept_stage", "decline"]),
      allowCamera: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: req } = await supabase
      .from("raise_hand_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!req) throw new Error("Request not found");
    await assertHostOrMod(supabase, userId, req.stream_id);

    if (data.action === "decline") {
      await supabase.from("raise_hand_requests").update({ status: "declined" }).eq("id", req.id);
      return { ok: true };
    }

    const stageRole = data.action === "accept_stage" ? "speaker" : "green_room";
    const allowCamera = data.action === "accept_stage" ? (data.allowCamera ?? false) : false;
    const { error: spErr } = await supabase
      .from("stage_participants")
      .upsert(
        { stream_id: req.stream_id, user_id: req.user_id, stage_role: stageRole, allow_camera: allowCamera },
        { onConflict: "stream_id,user_id" },
      );
    if (spErr) throw new Error(spErr.message);
    await syncLiveKitPublishPermission(
      supabase,
      req.stream_id,
      req.user_id,
      stageRole,
      { allowCamera },
    );
    await supabase.from("raise_hand_requests").update({ status: "accepted" }).eq("id", req.id);
    return { ok: true };
  });

/** Host moves a participant between stage_role values */
export const setStageRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      stageRole: z.enum(["host", "co_host", "speaker", "listener", "green_room"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    // Enforce caps: max 5 hosts, max 20 guests (speakers)
    if (data.stageRole === "host" || data.stageRole === "speaker") {
      const { data: existing } = await supabase
        .from("stage_participants")
        .select("user_id, stage_role")
        .eq("stream_id", data.streamId);
      const already = (existing ?? []).find((r: any) => r.user_id === data.targetUserId);
      const count = (existing ?? []).filter(
        (r: any) => r.stage_role === data.stageRole && r.user_id !== data.targetUserId,
      ).length;
      const cap = data.stageRole === "host" ? 5 : 20;
      if (count >= cap) {
        throw new Error(
          data.stageRole === "host" ? "Host limit reached (5)" : "Guest limit reached (20)",
        );
      }
      void already;
    }
    const { error } = await supabase
      .from("stage_participants")
      .upsert(
        { stream_id: data.streamId, user_id: data.targetUserId, stage_role: data.stageRole },
        { onConflict: "stream_id,user_id" },
      );
    if (error) throw new Error(error.message);
    await syncLiveKitPublishPermission(supabase, data.streamId, data.targetUserId, data.stageRole);
    return { ok: true };
  });

/** Remove a participant entirely from the stage record */
export const removeStageParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ streamId: z.string().uuid(), targetUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    const { error } = await supabase
      .from("stage_participants")
      .delete()
      .eq("stream_id", data.streamId)
      .eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Guest leaves the stage and returns to listener */
export const leaveStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("stage_participants")
      .upsert(
        { stream_id: data.streamId, user_id: userId, stage_role: "listener" },
        { onConflict: "stream_id,user_id" },
      );
    if (error) throw new Error(error.message);
    await syncLiveKitPublishPermission(supabase, data.streamId, userId, "listener");
    return { ok: true };
  });

/** Host mutes/unmutes a stage participant. Mute writes a future timestamp;
 *  unmute clears it. Clients enforce by checking muted_until > now. */
export const setParticipantMute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      mute: z.boolean(),
      durationMinutes: z.number().int().min(1).max(360).default(60),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    const mutedUntil = data.mute
      ? new Date(Date.now() + data.durationMinutes * 60_000).toISOString()
      : null;
    const { error } = await supabase
      .from("stage_participants")
      .update({ muted_until: mutedUntil })
      .eq("stream_id", data.streamId)
      .eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Current user heartbeat. Uses a narrow server-side update so speakers/hosts
 * can refresh connection_status without granting clients permission to edit
 * their own stage_role. */
export const updateMyStagePresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      connectionStatus: z.enum(["connected", "reconnecting", "disconnected"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { connection_status: string; last_seen_at?: string } = { connection_status: data.connectionStatus };
    if (data.connectionStatus === "connected") patch.last_seen_at = new Date().toISOString();

    // Idempotent: update existing row first (preserves stage_role assigned by
    // the host), then upsert with ignoreDuplicates to seed a listener row if
    // missing. Repeated calls produce the same result and never duplicate.
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("stage_participants")
      .update(patch)
      .eq("stream_id", data.streamId)
      .eq("user_id", context.userId)
      .select("id, stage_role, connection_status, last_seen_at")
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);

    if (updated) return { ok: true, participant: updated };

    const { data: seeded, error: insErr } = await supabaseAdmin
      .from("stage_participants")
      .upsert(
        {
          stream_id: data.streamId,
          user_id: context.userId,
          stage_role: "listener",
          ...patch,
        },
        { onConflict: "stream_id,user_id", ignoreDuplicates: true },
      )
      .select("id, stage_role, connection_status, last_seen_at")
      .maybeSingle();
    if (insErr) throw new Error(insErr.message);
    return { ok: true, participant: seeded ?? null };
  });
/** Viewer joins the stage as a listener. Idempotent per (user, stream, key)
 *  via request_idempotency, so retries / Strict Mode double-invokes / network
 *  replays return the same cached response and never create duplicate rows.
 *  The underlying upsert on (stream_id, user_id) is the second line of defense. */
export const joinStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      idempotencyKey: z.string().min(1).max(128).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return runIdempotent({
      supabase,
      userId,
      key: createIdempotencyKey("join_stage", data.streamId, userId),
      action: "join_stage",
      handler: async () => {
        const { data: row, error } = await supabase
          .from("stage_participants")
          .upsert(
            {
              stream_id: data.streamId,
              user_id: userId,
              stage_role: "listener",
            },
            { onConflict: "stream_id,user_id", ignoreDuplicates: false },
          )
          .select("id, stage_role, connection_status")
          .maybeSingle();
        if (error) throw new Error(error.message);
        return { ok: true, participant: row ?? null };
      },
    });
  });

/** Update the stream's host-transfer mode setting (primary host only) */
export const setHostTransferMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      mode: z.enum(["co_host", "transfer"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: stream } = await supabase
      .from("streams").select("host_id").eq("id", data.streamId).maybeSingle();
    if (!stream || stream.host_id !== userId) throw new Error("Only the stream owner can change this setting");
    const { error } = await supabase
      .from("streams").update({ host_transfer_mode: data.mode }).eq("id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Promote an approved stage participant to host or co-host, or transfer ownership.
 *  - mode "co_host": target becomes co_host, original host unchanged
 *  - mode "host":    target becomes host (additional host slot, original unchanged)
 *  - mode "transfer": streams.host_id moves to target; original host becomes co_host
 */
export const promoteToHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      mode: z.enum(["host", "co_host", "transfer"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: stream } = await supabase
      .from("streams").select("host_id, host_transfer_mode").eq("id", data.streamId).maybeSingle();
    if (!stream) throw new Error("Stream not found");

    // Only primary host or admins/mods can promote; transfer requires primary host.
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isPrimary = stream.host_id === userId;
    const isMod = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
    if (!isPrimary && !isMod) throw new Error("Only the host or an admin can promote");
    if (data.mode === "transfer" && !isPrimary && !isMod) throw new Error("Only the host can transfer ownership");

    const { data: existing } = await supabase
      .from("stage_participants").select("stage_role")
      .eq("stream_id", data.streamId).eq("user_id", data.targetUserId).maybeSingle();
    const previousRole = existing?.stage_role ?? null;

    if (data.mode === "transfer") {
      // 1) target -> host (also flip streams.host_id)
      const { error: e1 } = await supabase.from("streams")
        .update({ host_id: data.targetUserId }).eq("id", data.streamId);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await supabase.from("stage_participants").upsert(
        { stream_id: data.streamId, user_id: data.targetUserId, stage_role: "host" },
        { onConflict: "stream_id,user_id" },
      );
      if (e2) throw new Error(e2.message);
      await syncLiveKitPublishPermission(supabase, data.streamId, data.targetUserId, "host");
      // 2) original host -> co_host
      const { error: e3 } = await supabase.from("stage_participants").upsert(
        { stream_id: data.streamId, user_id: stream.host_id, stage_role: "co_host" },
        { onConflict: "stream_id,user_id" },
      );
      if (e3) throw new Error(e3.message);
      await syncLiveKitPublishPermission(supabase, data.streamId, stream.host_id, "co_host");
      await logHostAction(supabase, {
        actorId: userId, action: "transfer_ownership",
        streamId: data.streamId, targetUserId: data.targetUserId,
        previousRole, newRole: "host",
        summary: `Transferred ownership to ${data.targetUserId}`,
      });
    } else {
      const newRole = data.mode === "host" ? "host" : "co_host";
      const { error } = await supabase.from("stage_participants").upsert(
        { stream_id: data.streamId, user_id: data.targetUserId, stage_role: newRole },
        { onConflict: "stream_id,user_id" },
      );
      if (error) throw new Error(error.message);
      await syncLiveKitPublishPermission(supabase, data.streamId, data.targetUserId, newRole);
      await logHostAction(supabase, {
        actorId: userId, action: data.mode === "host" ? "promote_host" : "promote_co_host",
        streamId: data.streamId, targetUserId: data.targetUserId,
        previousRole, newRole,
        summary: `Promoted ${data.targetUserId} to ${newRole}`,
      });
    }
    return { ok: true };
  });

/** Revoke host/co-host privileges, returning the user to speaker (guest). */
export const revokeHostPrivileges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ streamId: z.string().uuid(), targetUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: stream } = await supabase
      .from("streams").select("host_id").eq("id", data.streamId).maybeSingle();
    if (!stream) throw new Error("Stream not found");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isPrimary = stream.host_id === userId;
    const isMod = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
    if (!isPrimary && !isMod) throw new Error("Only the host or an admin can revoke privileges");
    if (data.targetUserId === stream.host_id) throw new Error("Cannot revoke the primary host. Transfer ownership first.");

    const { data: existing } = await supabase
      .from("stage_participants").select("stage_role")
      .eq("stream_id", data.streamId).eq("user_id", data.targetUserId).maybeSingle();
    const previousRole = existing?.stage_role ?? null;

    const { error } = await supabase.from("stage_participants").upsert(
      { stream_id: data.streamId, user_id: data.targetUserId, stage_role: "speaker" },
      { onConflict: "stream_id,user_id" },
    );
    if (error) throw new Error(error.message);
    await syncLiveKitPublishPermission(supabase, data.streamId, data.targetUserId, "speaker");
    await logHostAction(supabase, {
      actorId: userId, action: "revoke_host",
      streamId: data.streamId, targetUserId: data.targetUserId,
      previousRole, newRole: "speaker",
      summary: `Revoked host privileges for ${data.targetUserId}`,
    });
    return { ok: true };
  });

/** Demote any stage participant (host, co_host, speaker, green_room) back to
 *  audience (listener). Removes mic/camera publish rights via stage_role.
 *  Cannot self-demote. Cannot demote the primary stream host — transfer
 *  ownership first. */
export const demoteToAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ streamId: z.string().uuid(), targetUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.targetUserId === userId) throw new Error("You cannot demote yourself");
    const { data: stream } = await supabase
      .from("streams").select("host_id").eq("id", data.streamId).maybeSingle();
    if (!stream) throw new Error("Stream not found");
    if (data.targetUserId === stream.host_id)
      throw new Error("Cannot demote the primary host. Transfer ownership first.");

    await assertHostOrMod(supabase, userId, data.streamId);

    const { data: existing } = await supabase
      .from("stage_participants").select("stage_role")
      .eq("stream_id", data.streamId).eq("user_id", data.targetUserId).maybeSingle();
    const previousRole = existing?.stage_role ?? null;

    const { error } = await supabase.from("stage_participants").upsert(
      { stream_id: data.streamId, user_id: data.targetUserId, stage_role: "listener" },
      { onConflict: "stream_id,user_id" },
    );
    if (error) throw new Error(error.message);
    await syncLiveKitPublishPermission(supabase, data.streamId, data.targetUserId, "listener");

    await logHostAction(supabase, {
      actorId: userId, action: "demote_to_audience",
      streamId: data.streamId, targetUserId: data.targetUserId,
      previousRole, newRole: "listener",
      summary: `Demoted ${data.targetUserId} to audience`,
    });
    return { ok: true };
  });

export const setStreamSpotlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        streamId: z.string().uuid(),
        targetUserId: z.string().uuid().nullable(),
        slot: z.enum(["host", "artist"]).default("artist"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    const column =
      data.slot === "host" ? "spotlight_host_user_id" : "spotlight_user_id";
    const { error } = await supabase
      .from("streams")
      .update({ [column]: data.targetUserId } as any)
      .eq("id", data.streamId);
    if (error) throw new Error(error.message);
    await logHostAction(supabase, {
      actorId: userId,
      action: data.targetUserId ? "spotlight_set" : "spotlight_clear",
      streamId: data.streamId,
      targetUserId: data.targetUserId ?? userId,
      previousRole: null,
      newRole: null,
      summary: data.targetUserId
        ? `Spotlighted ${data.targetUserId} to ${data.slot} panel`
        : `Cleared ${data.slot} spotlight`,
    });
    return { ok: true };
  });
