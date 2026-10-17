import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Records one play that actually started: a permanent stream event (linked
 * to the song and, via the database trigger, its artist) plus the song's
 * saved play count. Artist totals are derived from these saved values.
 */
export const incrementTrackPlayCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ trackId: z.string().uuid(), playId: z.string().min(8).max(80).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: event, error: eventError } = await sb.rpc("record_stream_event", {
      p_track_id: data.trackId,
      p_duration_played_seconds: 0,
      p_client_session_id: data.playId ?? null,
      p_metadata: { source: "player_start", ...listenerLocation() },
    });
    if (eventError) {
      console.error("[play-count] stream event failed", eventError.message);
      throw new Error("Could not save this play.");
    }
    const { data: count, error } = await sb.rpc("increment_track_play_count", {
      _track_id: data.trackId,
    });
    if (error) {
      console.error("[play-count] increment failed", error.message);
      throw new Error("Could not save this play.");
    }
    return { eventId: String(event.id), trackId: data.trackId, play_count: (count as number | null) ?? 0 };
  });

/** Approximate listener location from the hosting edge (country/city only, never the IP). */
function listenerLocation(): Record<string, string> {
  try {
    const req = getRequest() as any;
    const cf = req?.cf ?? {};
    const h = (k: string) => req?.headers?.get?.(k) ?? undefined;
    const code = String(cf.country ?? h("cf-ipcountry") ?? "").toUpperCase();
    const out: Record<string, string> = {};
    if (/^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") {
      out.country_code = code;
      out.country = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
    }
    const city = cf.city ?? h("cf-ipcity");
    const region = cf.region ?? h("cf-region");
    const continent = cf.continent ?? h("cf-ipcontinent");
    if (city) out.city = String(city).slice(0, 80);
    if (region) out.region = String(region).slice(0, 80);
    if (continent) out.continent = String(continent).slice(0, 10);
    return out;
  } catch {
    return {};
  }
}

export const updatePlaybackProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ eventId: z.string().uuid(), seconds: z.number().int().min(0).max(36000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: qualified, error } = await context.supabase.rpc("update_stream_playback_progress", {
      p_event_id: data.eventId, p_duration_played_seconds: data.seconds,
    });
    if (error) throw new Error("Could not save playback progress.");
    return { qualified: !!qualified };
  });
