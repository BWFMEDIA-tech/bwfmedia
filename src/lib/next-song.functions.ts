import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  streamId: z.string().uuid(),
  reactions: z.record(z.string().max(40), z.number().int().min(0).max(1_000_000)).default({}),
});

export type NextSongRecommendation = { trackId: string | null; title: string; reason: string };

/** Owner-only: asks the AI Gateway which uploaded song to play next, given live reaction totals and the current track. */
export const recommendNextSong = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<NextSongRecommendation> => {
    const { supabase, userId } = context;
    const { data: stream } = await supabase.from("streams").select("id, host_id").eq("id", data.streamId).maybeSingle();
    if (!stream || stream.host_id !== userId) throw new Error("Only the artist running this live can get recommendations.");

    const [{ data: songs }, { data: setlist }] = await Promise.all([
      supabase.from("play_tracks").select("id, title, play_count, like_count").eq("artist_user_id", userId).order("created_at", { ascending: false }).limit(60),
      supabase.from("live_setlist_items").select("track_id, title, status").eq("stream_id", data.streamId),
    ]);
    const unique = new Map<string, { id: string; title: string; plays: number; likes: number }>();
    for (const s of songs ?? []) if (!unique.has(s.title)) unique.set(s.title, { id: s.id, title: s.title, plays: s.play_count ?? 0, likes: s.like_count ?? 0 });
    const catalog = [...unique.values()];
    if (catalog.length === 0) throw new Error("Upload some songs first so there's something to recommend.");

    const current = setlist?.find((i) => i.status === "playing")?.title ?? null;
    const played = (setlist ?? []).filter((i) => i.status === "played").map((i) => i.title);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured for this app.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const prompt = JSON.stringify({
      currentTrack: current,
      alreadyPlayed: played,
      liveReactionTotals: data.reactions,
      uploadedSongs: catalog,
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system:
        "You are a live-set DJ assistant for an independent artist. Pick ONE song from uploadedSongs to play next. Read reaction totals (keys like 'artist:🔥' or 'track:🔁') as crowd energy: high hype keeps energy up, '🔁' means they want more of this vibe. Avoid the current track and already-played songs when possible. Reply ONLY with JSON: {\"trackId\": string, \"title\": string, \"reason\": string} where reason is one friendly sentence under 25 words.",
      prompt,
      providerOptions: {
        openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
      },
    });
    let text: string;
    try {
      text = await result.text;
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) throw new Error("Too many requests right now — try again in a moment.");
      if (status === 402) throw new Error("AI credits have run out for this workspace.");
      throw new Error(e?.message ?? "The recommendation could not be generated.");
    }
    let parsed: any = {};
    try { parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { /* fall through */ }
    const match = catalog.find((s) => s.id === parsed.trackId) ?? catalog.find((s) => s.title === parsed.title);
    if (!match) throw new Error("The AI didn't return a usable pick. Try again.");
    return { trackId: match.id, title: match.title, reason: String(parsed.reason ?? "").slice(0, 200) };
  });
