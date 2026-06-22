import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Battle Engine — single authoritative event dispatcher for Play Arena 1v1
 * battles. The host UI MUST go through `dispatchBattleEvent`; UI never
 * mutates `battle_matches` / `battle_rounds` / `play_tracks` directly.
 *
 * All transitions and side-effects (writes to matches, rounds, play_tracks
 * "playing" flag, voting open/close, winner calculation, round advancement)
 * are decided here. The UI is a pure control surface that emits events and
 * reflects `getBattleRoomState` output.
 */

const EVENT_TYPES = [
  "START_ROUND",
  "PLAY_SIDE_A_TRACK",
  "PLAY_SIDE_B_TRACK",
  "STOP_TRACK",
  "OPEN_VOTING",
  "CLOSE_VOTING",
  "FINALIZE_ROUND",
  "NEXT_ROUND",
  "END_ROUND",
  "CANCEL_BATTLE",
] as const;
export type BattleEventType = (typeof EVENT_TYPES)[number];

async function assertHost(supabase: any, userId: string, matchId: string) {
  const { data: m } = await supabase
    .from("battle_matches")
    .select(
      "id, stream_id, host_id, status, current_round, total_rounds, a_wins, b_wins, artist_a_id, artist_b_id, active_side, current_round_id, round_seconds",
    )
    .eq("id", matchId)
    .maybeSingle();
  if (!m) throw new Error("Match not found");
  if (m.host_id !== userId) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Only the host can manage this match");
  }
  return m;
}

function invalid(msg: string): never {
  throw new Error(`INVALID_TRANSITION: ${msg}`);
}

/** Pure handler so wrappers in battles.functions.ts can call into the engine
 *  without going back through the server-fn RPC boundary. */
export async function runBattleEvent(
  supabase: any,
  userId: string,
  data: { matchId: string; type: BattleEventType; payload?: { trackId?: string } },
) {
    const m = await assertHost(supabase, userId, data.matchId);
    if (m.status === "completed" || m.status === "cancelled") {
      invalid(`match is ${m.status}`);
    }

    const loadCurrentRound = async () => {
      if (!m.current_round_id) return null;
      const { data: r } = await supabase
        .from("battle_rounds")
        .select("*")
        .eq("id", m.current_round_id)
        .maybeSingle();
      return r;
    };

    switch (data.type) {
      case "START_ROUND": {
        if (m.current_round >= m.total_rounds) invalid("all rounds played");
        const cur = await loadCurrentRound();
        if (cur && cur.status === "live") invalid("a round is already live");
        const nextNumber = m.current_round + 1;
        const now = new Date();
        const endsAt = new Date(now.getTime() + (m.round_seconds ?? 60) * 1000);
        const { data: round, error } = await supabase
          .from("battle_rounds")
          .upsert(
            {
              match_id: m.id,
              round_number: nextNumber,
              status: "live",
              voting_status: "closed",
              started_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
            },
            { onConflict: "match_id,round_number" },
          )
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        await supabase
          .from("battle_matches")
          .update({
            status: "live",
            current_round: nextNumber,
            current_round_id: round.id,
            active_side: null,
            started_at: m.status === "pending" ? now.toISOString() : undefined,
          })
          .eq("id", m.id);
        return { ok: true, round };
      }

      case "PLAY_SIDE_A_TRACK":
      case "PLAY_SIDE_B_TRACK": {
        const side: "a" | "b" = data.type === "PLAY_SIDE_A_TRACK" ? "a" : "b";
        const trackId = data.payload?.trackId;
        if (!trackId) invalid("trackId required");
        const round = await loadCurrentRound();
        if (!round || round.status !== "live") invalid("no live round");

        // Validate track belongs to the right artist and is on this stream.
        const { data: track } = await supabase
          .from("play_tracks")
          .select("id, stream_id, artist_user_id, status")
          .eq("id", trackId!)
          .maybeSingle();
        if (!track || track.stream_id !== m.stream_id) invalid("track not on stream");
        const expectedArtist = side === "a" ? m.artist_a_id : m.artist_b_id;
        if (track.artist_user_id !== expectedArtist) {
          invalid(`track is not Artist ${side.toUpperCase()}'s`);
        }

        // Demote any currently playing track on the stream to completed and
        // stamp the previously-playing side as finished.
        const { data: nowPlaying } = await supabase
          .from("play_tracks")
          .select("id, artist_user_id")
          .eq("stream_id", m.stream_id)
          .eq("status", "playing");
        if (nowPlaying && nowPlaying.length) {
          await supabase
            .from("play_tracks")
            .update({ status: "completed" })
            .in("id", nowPlaying.map((t: any) => t.id));
        }
        if (m.active_side && m.active_side !== side) {
          const stampCol =
            m.active_side === "a" ? "a_track_finished_at" : "b_track_finished_at";
          await supabase
            .from("battle_rounds")
            .update({ [stampCol]: new Date().toISOString() } as any)
            .eq("id", round.id);
        }

        // Mark this track playing.
        if (track.status === "queued") {
          const { error: upErr } = await supabase
            .from("play_tracks")
            .update({ status: "playing" })
            .eq("id", trackId!);
          if (upErr) throw new Error(upErr.message);
        }
        const trackCol = side === "a" ? "a_playing_track_id" : "b_playing_track_id";
        await supabase
          .from("battle_rounds")
          .update({ [trackCol]: trackId } as any)
          .eq("id", round.id);
        await supabase
          .from("battle_matches")
          .update({ active_side: side })
          .eq("id", m.id);
        return { ok: true, side, trackId };
      }

      case "STOP_TRACK": {
        const round = await loadCurrentRound();
        if (!round) invalid("no current round");
        const { data: nowPlaying } = await supabase
          .from("play_tracks")
          .select("id")
          .eq("stream_id", m.stream_id)
          .eq("status", "playing");
        if (nowPlaying && nowPlaying.length) {
          await supabase
            .from("play_tracks")
            .update({ status: "completed" })
            .in("id", nowPlaying.map((t: any) => t.id));
        }
        if (m.active_side) {
          const stampCol =
            m.active_side === "a" ? "a_track_finished_at" : "b_track_finished_at";
          await supabase
            .from("battle_rounds")
            .update({ [stampCol]: new Date().toISOString() } as any)
            .eq("id", round!.id);
        }
        await supabase
          .from("battle_matches")
          .update({ active_side: null })
          .eq("id", m.id);
        return { ok: true };
      }

      case "OPEN_VOTING": {
        const round = await loadCurrentRound();
        if (!round || round.status !== "live") invalid("no live round");
        if (!round.a_playing_track_id || !round.b_playing_track_id) {
          invalid("both sides must play a track before voting opens");
        }
        await supabase
          .from("battle_rounds")
          .update({ voting_status: "open" })
          .eq("id", round.id);
        return { ok: true };
      }

      case "CLOSE_VOTING": {
        const round = await loadCurrentRound();
        if (!round) invalid("no current round");
        await supabase
          .from("battle_rounds")
          .update({ voting_status: "closed" })
          .eq("id", round!.id);
        return { ok: true };
      }

      case "FINALIZE_ROUND": {
        const round = await loadCurrentRound();
        if (!round) invalid("no current round");
        if (round.voting_status === "finalized" && round.status === "closed") {
          return { ok: true, already: true };
        }
        const aScore = (round.a_weight as number) || 0;
        const bScore = (round.b_weight as number) || 0;
        const winner: "a" | "b" | "tie" =
          aScore === bScore ? "tie" : aScore > bScore ? "a" : "b";
        await supabase
          .from("battle_rounds")
          .update({
            status: "closed",
            voting_status: "finalized",
            winner_choice: winner,
          })
          .eq("id", round.id);
        const aWins = (m.a_wins as number) + (winner === "a" ? 1 : 0);
        const bWins = (m.b_wins as number) + (winner === "b" ? 1 : 0);
        await supabase
          .from("battle_matches")
          .update({ a_wins: aWins, b_wins: bWins, active_side: null })
          .eq("id", m.id);
        return { ok: true, winner, aWins, bWins };
      }

      case "NEXT_ROUND": {
        const round = await loadCurrentRound();
        if (round && round.voting_status !== "finalized") {
          invalid("finalize the current round first");
        }
        // Auto-complete the match if we just finished the last round.
        if (m.current_round >= m.total_rounds) {
          const aWins = m.a_wins as number;
          const bWins = m.b_wins as number;
          const overallWinner =
            aWins === bWins
              ? null
              : aWins > bWins
                ? (m.artist_a_id as string)
                : (m.artist_b_id as string);
          await supabase
            .from("battle_matches")
            .update({
              status: "completed",
              winner_id: overallWinner,
              ended_at: new Date().toISOString(),
              active_side: null,
            })
            .eq("id", m.id);
          return { ok: true, completed: true, winnerUserId: overallWinner };
        }
        // Otherwise open the next round, same as START_ROUND.
        const nextNumber = m.current_round + 1;
        const now = new Date();
        const endsAt = new Date(now.getTime() + (m.round_seconds ?? 60) * 1000);
        const { data: nextRound, error } = await supabase
          .from("battle_rounds")
          .upsert(
            {
              match_id: m.id,
              round_number: nextNumber,
              status: "live",
              voting_status: "closed",
              started_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
            },
            { onConflict: "match_id,round_number" },
          )
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        await supabase
          .from("battle_matches")
          .update({
            current_round: nextNumber,
            current_round_id: nextRound.id,
            active_side: null,
          })
          .eq("id", m.id);
        return { ok: true, round: nextRound };
      }

      case "END_ROUND": {
        // Same as FINALIZE but doesn't require voting to have opened first.
        const round = await loadCurrentRound();
        if (!round) invalid("no current round");
        const aScore = (round.a_weight as number) || 0;
        const bScore = (round.b_weight as number) || 0;
        const winner: "a" | "b" | "tie" =
          aScore === bScore ? "tie" : aScore > bScore ? "a" : "b";
        await supabase
          .from("battle_rounds")
          .update({
            status: "closed",
            voting_status: "finalized",
            winner_choice: winner,
          })
          .eq("id", round!.id);
        const aWins = (m.a_wins as number) + (winner === "a" ? 1 : 0);
        const bWins = (m.b_wins as number) + (winner === "b" ? 1 : 0);
        const isLast = (m.current_round as number) >= (m.total_rounds as number);
        if (isLast) {
          const overallWinner =
            aWins === bWins
              ? null
              : aWins > bWins
                ? (m.artist_a_id as string)
                : (m.artist_b_id as string);
          await supabase
            .from("battle_matches")
            .update({
              a_wins: aWins,
              b_wins: bWins,
              winner_id: overallWinner,
              status: "completed",
              ended_at: new Date().toISOString(),
              active_side: null,
            })
            .eq("id", m.id);
        } else {
          await supabase
            .from("battle_matches")
            .update({ a_wins: aWins, b_wins: bWins, active_side: null })
            .eq("id", m.id);
        }
        return { ok: true, winner, aWins, bWins, completed: isLast };
      }

      case "CANCEL_BATTLE": {
        await supabase
          .from("battle_rounds")
          .update({ status: "closed", voting_status: "closed" })
          .eq("match_id", m.id)
          .eq("status", "live");
        await supabase
          .from("battle_matches")
          .update({
            status: "cancelled",
            ended_at: new Date().toISOString(),
            active_side: null,
          })
          .eq("id", m.id);
        return { ok: true };
      }

      default:
        invalid(`unknown event ${data.type}`);
    }
}

export const dispatchBattleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        matchId: z.string().uuid(),
        type: z.enum(EVENT_TYPES),
        payload: z
          .object({ trackId: z.string().uuid().optional() })
          .partial()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    runBattleEvent(context.supabase, context.userId, data),
  );

/** Single authoritative snapshot for any battle on a stream. */
export const getBattleRoomState = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: match } = await sb
      .from("battle_matches")
      .select("*")
      .eq("stream_id", data.streamId)
      .in("status", ["pending", "live"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!match) {
      return {
        match: null,
        rounds: [],
        currentRound: null,
        activeSide: null,
        votingStatus: "closed" as const,
        aTrack: null,
        bTrack: null,
        battleStatus: null,
      };
    }
    const { data: rounds } = await sb
      .from("battle_rounds")
      .select("*")
      .eq("match_id", match.id)
      .order("round_number", { ascending: true });
    const currentRound =
      (rounds ?? []).find((r: any) => r.id === match.current_round_id) ?? null;
    const trackIds = [
      currentRound?.a_playing_track_id,
      currentRound?.b_playing_track_id,
    ].filter(Boolean) as string[];
    let aTrack: any = null;
    let bTrack: any = null;
    if (trackIds.length) {
      const { data: tracks } = await sb
        .from("play_tracks")
        .select("id, title, cover_url, audio_url, artist_name, artist_user_id, status")
        .in("id", trackIds);
      aTrack =
        (tracks ?? []).find((t: any) => t.id === currentRound?.a_playing_track_id) ??
        null;
      bTrack =
        (tracks ?? []).find((t: any) => t.id === currentRound?.b_playing_track_id) ??
        null;
    }

    // Fallback: if the host hasn't picked a track to play yet for a side,
    // show that artist's most recent submitted track (cover + title) so the
    // album art appears as soon as the artist submits. This is display-only;
    // the engine still requires a real PLAY_SIDE_*_TRACK to start playback.
    const needFallback: Array<{ side: "a" | "b"; artistId: string | null }> = [];
    if (!aTrack && match.artist_a_id) needFallback.push({ side: "a", artistId: match.artist_a_id as string });
    if (!bTrack && match.artist_b_id) needFallback.push({ side: "b", artistId: match.artist_b_id as string });
    if (needFallback.length) {
      const artistIds = needFallback.map((n) => n.artistId!).filter(Boolean);
      const { data: subs } = await sb
        .from("play_tracks")
        .select("id, title, cover_url, audio_url, artist_name, artist_user_id, status, created_at")
        .eq("stream_id", data.streamId)
        .in("artist_user_id", artistIds)
        .in("status", ["queued", "playing"])
        .order("created_at", { ascending: false });
      for (const n of needFallback) {
        const t = (subs ?? []).find((row: any) => row.artist_user_id === n.artistId) ?? null;
        if (t) {
          if (n.side === "a") aTrack = t;
          else bTrack = t;
        }
      }
    }

    return {
      match,
      rounds: rounds ?? [],
      currentRound,
      activeSide: (match.active_side as "a" | "b" | null) ?? null,
      votingStatus:
        (currentRound?.voting_status as "closed" | "open" | "finalized") ?? "closed",
      aTrack,
      bTrack,
      battleStatus: match.status as string,
    };
  });

/** Queued tracks for a battle's two artists, used by the host control panel to pick which song to play. */
export const getBattleArtistQueues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ matchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: m } = await sb
      .from("battle_matches")
      .select("stream_id, artist_a_id, artist_b_id")
      .eq("id", data.matchId)
      .maybeSingle();
    if (!m) return { a: [], b: [] };
    const { data: rows } = await sb
      .from("play_tracks")
      .select("id, title, cover_url, artist_user_id, status, position, created_at")
      .eq("stream_id", m.stream_id)
      .in("artist_user_id", [m.artist_a_id, m.artist_b_id])
      .in("status", ["queued", "playing"])
      .order("created_at", { ascending: true });
    const a = (rows ?? []).filter((r: any) => r.artist_user_id === m.artist_a_id);
    const b = (rows ?? []).filter((r: any) => r.artist_user_id === m.artist_b_id);
    return { a, b };
  });
