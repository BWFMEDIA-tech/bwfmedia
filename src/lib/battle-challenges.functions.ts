import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BATTLE_GENRES } from "@/lib/battle-genres";
import {
  CHALLENGE_STATUSES,
  canCancelChallenge,
  canDeclineChallenge,
  canRespondToChallenge,
  canStartChallenge,
} from "@/lib/battle-challenges";

const genreSchema = z.enum(BATTLE_GENRES);

type Ctx = { supabase: any; userId: string };

async function isHostOrAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (roles ?? []).some((r: any) => r.role === "host" || r.role === "admin");
}

type ProfileInfo = { name: string; avatar: string | null };

async function profileSummary(supabase: any, ids: string[]): Promise<Map<string, ProfileInfo>> {
  const map = new Map<string, ProfileInfo>();
  if (!ids.length) return map;
  const { data } = await supabase
    .from("public_profiles")
    .select("id, display_name, stage_name, avatar_url")
    .in("id", ids);
  for (const p of (data ?? []) as any[]) {
    map.set(p.id as string, {
      name: (p.stage_name as string | null) ?? (p.display_name as string | null) ?? "Artist",
      avatar: (p.avatar_url as string | null) ?? null,
    });
  }
  return map;
}

async function notify(userIds: string[], n: { actorId: string; type: string; title: string; body?: string | null; link?: string | null }) {
  const { notifyBattleUsers } = await import("@/lib/battle-notifications.server");
  await notifyBattleUsers(userIds, n);
}

function withProfiles(rows: any[], profiles: Map<string, ProfileInfo>) {
  return rows.map((c) => ({
    ...c,
    challenger_name: profiles.get(c.challenger_id)?.name ?? "Artist",
    challenger_avatar: profiles.get(c.challenger_id)?.avatar ?? null,
    challenged_name: profiles.get(c.challenged_id)?.name ?? "Artist",
    challenged_avatar: profiles.get(c.challenged_id)?.avatar ?? null,
  }));
}

/** Artist challenges another artist to a 1v1 battle in a chosen genre. */
export const submitBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ challengedId: z.string().uuid(), genre: genreSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    if (data.challengedId === userId) throw new Error("You can't challenge yourself");

    // Both participants must be artists.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", [userId, data.challengedId])
      .eq("role", "artist");
    const artistIds = new Set((roles ?? []).map((r: any) => r.user_id));
    if (!artistIds.has(userId)) throw new Error("Only artist accounts can send battle challenges");
    if (!artistIds.has(data.challengedId)) throw new Error("That account is not an artist");

    const { data: challenge, error } = await supabase
      .from("battle_challenges")
      .insert({ challenger_id: userId, challenged_id: data.challengedId, genre: data.genre })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const profiles = await profileSummary(supabase, [userId, data.challengedId]);
    const me = profiles.get(userId)?.name ?? "An artist";
    await notify([data.challengedId], {
      actorId: userId,
      type: "battle_challenge",
      title: `${me} wants to battle you`,
      body: `Genre: ${data.genre}. Open the Battle Arena to accept or decline.`,
    });
    await notify([userId], {
      actorId: userId,
      type: "battle_challenge",
      title: "Challenge submitted",
      body: `Your ${data.genre} challenge to ${profiles.get(data.challengedId)?.name ?? "the artist"} was sent to the host queue.`,
    });
    return { ok: true, challengeId: challenge.id };
  });

/** Challenges the signed-in artist sent or received. */
export const listMyBattleChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as Ctx;
    const { data, error } = await supabase
      .from("battle_challenges")
      .select("id, challenger_id, challenged_id, genre, status, scheduled_at, match_id, created_at")
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).flatMap((c: any) => [c.challenger_id, c.challenged_id]))) as string[];
    const profiles = await profileSummary(supabase, ids);
    return { challenges: withProfiles(data ?? [], profiles), userId };
  });

/** Challenged artist accepts or declines a pending challenge. */
export const respondBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ challengeId: z.string().uuid(), accept: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { data: c } = await supabase
      .from("battle_challenges")
      .select("id, challenger_id, challenged_id, genre, status")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!c) throw new Error("Challenge not found");
    if (c.challenged_id !== userId) throw new Error("Only the challenged artist can respond");
    if (!canRespondToChallenge(c.status)) throw new Error("This challenge was already answered");

    const next = data.accept ? "accepted" : "declined";
    const { error } = await supabase
      .from("battle_challenges")
      .update({ status: next })
      .eq("id", c.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    const profiles = await profileSummary(supabase, [c.challenger_id, c.challenged_id]);
    const me = profiles.get(userId)?.name ?? "The artist";
    await notify([c.challenger_id, c.challenged_id], {
      actorId: userId,
      type: "battle_challenge",
      title: data.accept ? "Battle challenge accepted" : "Battle challenge declined",
      body: data.accept
        ? `${me} accepted the ${c.genre} battle. The host will schedule it next.`
        : `${me} declined the ${c.genre} battle.`,
    });
    return { ok: true, status: next };
  });

/** Either artist cancels their own challenge before it goes live. */
export const cancelBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ challengeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { data: c } = await supabase
      .from("battle_challenges")
      .select("id, challenger_id, challenged_id, genre, status")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!c) throw new Error("Challenge not found");
    if (c.challenger_id !== userId && c.challenged_id !== userId) throw new Error("Not your challenge");
    if (!canCancelChallenge(c.status)) throw new Error("This challenge can no longer be cancelled");

    const { error } = await supabase.from("battle_challenges").update({ status: "cancelled" }).eq("id", c.id);
    if (error) throw new Error(error.message);
    const other = c.challenger_id === userId ? c.challenged_id : c.challenger_id;
    await notify([other], {
      actorId: userId,
      type: "battle_challenge",
      title: "Battle challenge cancelled",
      body: `The ${c.genre} battle challenge was cancelled.`,
    });
    return { ok: true };
  });

/** Host/admin: full challenge queue, optionally filtered by status. */
export const listHostBattleChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ status: z.enum(CHALLENGE_STATUSES).nullable().default(null) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    if (!(await isHostOrAdmin(supabase, userId))) throw new Error("Only hosts and admins can manage battles");
    let q = supabase
      .from("battle_challenges")
      .select("id, challenger_id, challenged_id, genre, status, scheduled_at, match_id, stream_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).flatMap((c: any) => [c.challenger_id, c.challenged_id]))) as string[];
    const profiles = await profileSummary(supabase, ids);
    return { challenges: withProfiles(rows ?? [], profiles) };
  });

/** Host/admin declines a proposed matchup. */
export const declineBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ challengeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    if (!(await isHostOrAdmin(supabase, userId))) throw new Error("Only hosts and admins can manage battles");
    const { data: c } = await supabase
      .from("battle_challenges")
      .select("id, challenger_id, challenged_id, genre, status")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!c) throw new Error("Challenge not found");
    if (!canDeclineChallenge(c.status)) throw new Error("This challenge can no longer be declined");
    const { error } = await supabase.from("battle_challenges").update({ status: "declined" }).eq("id", c.id);
    if (error) throw new Error(error.message);
    await notify([c.challenger_id, c.challenged_id], {
      actorId: userId,
      type: "battle_challenge",
      title: "Battle challenge declined",
      body: `The host declined the ${c.genre} matchup.`,
    });
    return { ok: true };
  });

/** Host/admin schedules an accepted challenge for a date/time. */
export const scheduleBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ challengeId: z.string().uuid(), scheduledAt: z.string().datetime() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    if (!(await isHostOrAdmin(supabase, userId))) throw new Error("Only hosts and admins can manage battles");
    const { data: c } = await supabase
      .from("battle_challenges")
      .select("id, challenger_id, challenged_id, genre, status")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!c) throw new Error("Challenge not found");
    if (!canDeclineChallenge(c.status)) throw new Error("This challenge can no longer be scheduled");
    const when = new Date(data.scheduledAt);
    if (when.getTime() < Date.now() - 60_000) throw new Error("Pick a time in the future");
    const { error } = await supabase
      .from("battle_challenges")
      .update({ status: "scheduled", scheduled_at: when.toISOString() })
      .eq("id", c.id);
    if (error) throw new Error(error.message);
    const whenText = when.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/Chicago" });
    await notify([c.challenger_id, c.challenged_id], {
      actorId: userId,
      type: "battle_challenge",
      title: "Battle scheduled",
      body: `Your ${c.genre} battle is scheduled for ${whenText} CT.`,
    });
    return { ok: true };
  });

/** Host/admin starts an accepted/scheduled challenge: creates the battle match
 *  on the host's own live room so it appears in the Battle Arena. */
export const startBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ challengeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    if (!(await isHostOrAdmin(supabase, userId))) throw new Error("Only hosts and admins can start battles");
    const { data: c } = await supabase
      .from("battle_challenges")
      .select("id, challenger_id, challenged_id, genre, status")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!c) throw new Error("Challenge not found");
    // Both artists must have agreed: challenger agreed by submitting, the
    // challenged artist agrees by accepting (status moves past "pending").
    if (!canStartChallenge(c.status)) {
      throw new Error("Both artists must agree before the battle can start");
    }

    const { data: streamId, error: sErr } = await supabase.rpc("get_or_create_profile_stream");
    if (sErr || !streamId) throw new Error(sErr?.message ?? "Could not open your battle room");
    const { data: live } = await supabase
      .from("battle_matches")
      .select("id")
      .eq("stream_id", streamId)
      .eq("status", "live")
      .maybeSingle();
    if (live) throw new Error("A battle is already live on your stream — finish it first");

    const profiles = await profileSummary(supabase, [c.challenger_id, c.challenged_id]);
    const { data: match, error } = await supabase
      .from("battle_matches")
      .insert({
        stream_id: streamId,
        host_id: userId,
        artist_a_id: c.challenger_id,
        artist_b_id: c.challenged_id,
        artist_a_name: profiles.get(c.challenger_id)?.name ?? "Artist",
        artist_b_name: profiles.get(c.challenged_id)?.name ?? "Artist",
        total_rounds: 3,
        round_seconds: 60,
        genre: c.genre,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Both artists already agreed through the challenge flow — pre-set the
    // genre agreement flags so the host can open round 1 immediately. The
    // genre guard trigger only allows this through the host-only RPC.
    const { error: aErr } = await supabase.rpc("battle_challenge_mark_agreed", { _match_id: match.id });
    if (aErr) throw new Error(aErr.message);

    const { error: uErr } = await supabase
      .from("battle_challenges")
      .update({ status: "live", match_id: match.id, stream_id: streamId })
      .eq("id", c.id);
    if (uErr) throw new Error(uErr.message);

    await notify([c.challenger_id, c.challenged_id], {
      actorId: userId,
      type: "battle_challenge",
      title: "Your battle is starting",
      body: `The host started your ${c.genre} battle. Head to the Battle Arena now.`,
    });

    const { data: stream } = await supabase.from("streams").select("room_name").eq("id", streamId).maybeSingle();
    return { ok: true, matchId: match.id, roomName: (stream?.room_name as string | null) ?? null };
  });
