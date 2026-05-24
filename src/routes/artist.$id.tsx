import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Play, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FutureShell } from "@/components/site/FutureShell";
import type { LiveQueueRow, LiveQueueTier, LiveQueueStatus } from "@/lib/useLiveQueue";
import { AudioPlayer } from "@/components/AudioUploader";

const RED = "#ef2b2b";

export const Route = createFileRoute("/artist/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Artist Profile — BWFMEDIA Live Review` },
      { name: "description", content: "BWFMEDIA featured artist profile." },
      { property: "og:title", content: `BWFMEDIA Artist Profile` },
    ],
  }),
  component: ArtistProfilePage,
});

const TIER_LABEL: Record<LiveQueueTier, string> = {
  premium: "Premium Spotlight",
  featured: "Featured Spotlight",
  basic: "Basic Submission",
};

const STATUS_LABEL: Record<LiveQueueStatus, string> = {
  live: "Now Reviewing Live",
  next_up: "Up Next",
  queued: "In Queue",
  done: "Reviewed",
};

function ArtistProfilePage() {
  const { id } = useParams({ from: "/artist/$id" });
  const [artist, setArtist] = useState<LiveQueueRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase
        .from("live_queue_public")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!mounted) return;
      setArtist((data as LiveQueueRow | null) ?? null);
      setLoading(false);
    }
    load();
    const channel = supabase
      .channel(`artist-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_submissions", filter: `id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <FutureShell>
      <div className="relative z-10 mx-auto max-w-4xl px-4 md:px-6 py-10 md:py-14">
        <Link
          to="/live-review"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-bone/70 hover:text-bone mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Live Review Room
        </Link>

        {loading ? (
          <div className="text-bone/60 text-sm">Loading artist…</div>
        ) : !artist ? (
          <div className="text-center py-16">
            <h1 className="font-anton text-3xl uppercase text-bone">Artist not found</h1>
            <p className="text-bone/60 mt-2 text-sm">
              This profile may not be public yet.
            </p>
          </div>
        ) : (
          <article
            className="grid md:grid-cols-[260px_1fr] gap-6 bg-black/40 border p-5 md:p-7"
            style={{ borderColor: `${RED}33` }}
          >
            <div
              className="relative aspect-[4/5] w-full overflow-hidden"
              style={{ background: `radial-gradient(circle, ${RED}33, #000 70%)` }}
            >
              {artist.photo_url ? (
                <img
                  src={artist.photo_url}
                  alt={artist.artist_name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-bone/25 font-anton text-7xl">
                  {artist.artist_name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
              )}
              <span
                className="absolute top-2 left-2 px-2 py-1 text-[9px] uppercase tracking-[0.2em] font-anton text-bone"
                style={{
                  background:
                    artist.tier === "premium"
                      ? RED
                      : artist.tier === "featured"
                        ? "#f5a623"
                        : "rgba(255,255,255,0.15)",
                  color: artist.tier === "featured" ? "#1a0606" : "#fff",
                }}
              >
                {TIER_LABEL[artist.tier]}
              </span>
            </div>

            <div className="flex flex-col">
              <div
                className="inline-flex items-center gap-2 self-start px-2 py-1 text-[10px] uppercase tracking-[0.3em] mb-3"
                style={{
                  background: artist.queue_status === "live" ? RED : "rgba(255,255,255,0.08)",
                  color: artist.queue_status === "live" ? "#fff" : "rgba(246,239,227,0.8)",
                }}
              >
                {artist.queue_status === "live" && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                )}
                {STATUS_LABEL[artist.queue_status]}
              </div>

              <h1 className="font-anton text-4xl md:text-5xl uppercase tracking-tight text-bone leading-none">
                {artist.artist_name}
              </h1>
              {artist.song_title && (
                <p className="text-bone/70 mt-2 text-lg">"{artist.song_title}"</p>
              )}

              <a
                href={artist.song_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 font-anton uppercase tracking-[0.15em] text-bone text-sm self-start hover:brightness-110 transition-all"
                style={{ background: RED, boxShadow: `0 0 24px ${RED}55` }}
              >
                <Play className="w-4 h-4 fill-current" /> Listen to Submission
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {artist.uploaded_audio_url && (
                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-bone/50 mb-2">
                    Uploaded Track
                  </div>
                  <div
                    className="border bg-black/40 p-3"
                    style={{ borderColor: `${RED}44` }}
                  >
                    <AudioPlayer src={artist.uploaded_audio_url} />
                    <div className="mt-2 h-8 w-full bg-gradient-to-r from-transparent via-white/5 to-transparent flex items-end gap-0.5 px-1">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <span
                          key={i}
                          className="flex-1"
                          style={{
                            height: `${20 + Math.abs(Math.sin(i * 0.6)) * 80}%`,
                            background: `${RED}55`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <dl className="mt-8 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="uppercase tracking-[0.25em] text-bone/50">Tier</dt>
                  <dd className="text-bone mt-1">{TIER_LABEL[artist.tier]}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.25em] text-bone/50">Status</dt>
                  <dd className="text-bone mt-1">{STATUS_LABEL[artist.queue_status]}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.25em] text-bone/50">Submitted</dt>
                  <dd className="text-bone mt-1">
                    {new Date(artist.paid_at ?? artist.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 pt-6 border-t" style={{ borderColor: `${RED}22` }}>
                <div className="text-[10px] uppercase tracking-[0.3em] text-bone/50 mb-2">
                  Live Review History
                </div>
                <p className="text-sm text-bone/70">
                  Past review clips will appear here after the live segment airs.
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </FutureShell>
  );
}