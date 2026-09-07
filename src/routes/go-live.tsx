import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radio, Copy, Check, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { startOrResumeStream, endStream, getMyActiveStream } from "@/lib/streams.functions";
import { getLiveKitToken } from "@/lib/livekit.functions";
import { LiveStage } from "@/components/stream/LiveStage";
import { LiveChat } from "@/components/stream/LiveChat";
import { LIVE_CATEGORIES } from "@/lib/live-categories";

export const Route = createFileRoute("/go-live")({
  head: () => ({
    meta: [
      { title: "Go Live from Your Profile — BWF Network" },
      { name: "description", content: "Start a live video stream straight from your artist profile. Pick a title and category, hit Go Live, and your fans can watch and chat instantly." },
      { property: "og:title", content: "Go Live from Your Profile — BWF Network" },
      { property: "og:description", content: "Start a live video stream straight from your artist profile and chat with fans in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoLivePage,
});

type ActiveStream = { id: string; room_name: string; title: string };

function GoLivePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const startFn = useServerFn(startOrResumeStream);
  const endFn = useServerFn(endStream);
  const resumeFn = useServerFn(getMyActiveStream);
  const tokenFn = useServerFn(getLiveKitToken);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(LIVE_CATEGORIES[0].id);
  const [stream, setStream] = useState<ActiveStream | null>(null);
  const [lk, setLk] = useState<{ token: string; wsUrl: string } | null>(null);
  const [going, setGoing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) navigate({ to: "/login" });
  }, [auth.loading, auth.isAuthenticated, navigate]);

  // Resume an in-progress stream after a refresh.
  useEffect(() => {
    if (!auth.user || stream || lk) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await resumeFn();
        if (cancelled || !existing) return;
        const t = await tokenFn({ data: { roomName: existing.room_name } });
        if (cancelled) return;
        setStream({ id: existing.id, room_name: existing.room_name, title: existing.title });
        setLk({ token: t.token, wsUrl: t.wsUrl });
        setStartedAt(existing.started_at ?? new Date().toISOString());
        toast.success("Reconnected to your live stream");
      } catch {
        /* nothing live */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user?.id]);

  const shareUrl = stream ? `${typeof window !== "undefined" ? window.location.origin : ""}/stream/${stream.room_name}` : "";

  const goLive = async () => {
    if (going) return;
    setGoing(true);
    try {
      const name = auth.user?.user_metadata?.full_name ?? auth.user?.user_metadata?.name ?? "Live";
      const s = await startFn({
        data: { title: title.trim() || `${name} — Live`, category },
      });
      const t = await tokenFn({ data: { roomName: s.room_name } });
      setStream(s as ActiveStream);
      setLk({ token: t.token, wsUrl: t.wsUrl });
      setStartedAt(new Date().toISOString());
      if (auth.user) {
        await supabase.from("stage_participants").upsert(
          { stream_id: s.id, user_id: auth.user.id, stage_role: "host" },
          { onConflict: "stream_id,user_id" },
        );
      }
      toast.success("You're live");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start your live stream");
    } finally {
      setGoing(false);
    }
  };

  const stopLive = async () => {
    if (!stream) return;
    try {
      await endFn({ data: { streamId: stream.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not end the stream");
    }
    setLk(null);
    setStream(null);
    setStartedAt(null);
    setViewerCount(0);
    toast.success("Live ended");
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (auth.loading || !auth.isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050509] text-sm text-white/60">Loading…</div>
    );
  }

  if (stream && lk) {
    return (
      <div className="min-h-screen bg-[#050509] text-white pb-24">
        <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF00A6] px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Live
            </span>
            <span className="truncate text-sm font-semibold">{stream.title}</span>
            <span className="inline-flex items-center gap-1 text-xs text-white/60">
              <Users className="h-3.5 w-3.5" /> {viewerCount}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs hover:bg-white/10"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Share link
              </button>
              <button
                onClick={stopLive}
                className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold hover:brightness-110"
              >
                End live
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <LiveStage
                token={lk.token}
                serverUrl={lk.wsUrl}
                streamId={stream.id}
                onEnd={stopLive}
                onInvite={copyLink}
                onViewerCount={setViewerCount}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              <LiveChat
                streamId={stream.id}
                auth={auth}
                viewerCount={viewerCount}
                startedAt={startedAt}
                hostId={auth.user?.id ?? null}
                status="live"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6 text-white md:max-w-xl md:pt-10">
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-xl"
          style={{ background: "linear-gradient(135deg, rgba(255,0,166,0.3), rgba(197,61,255,0.25))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Radio className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Go Live</h1>
          <p className="text-sm text-white/60">Stream straight from your profile. Fans get a live badge and can watch and chat.</p>
        </div>
      </div>

      <div className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="What's happening?"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[#C53DFF]/60"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Category</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LIVE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  category === c.id
                    ? "border-[#C53DFF] bg-[#C53DFF]/20 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={goLive}
          disabled={going}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-black uppercase tracking-wide disabled:opacity-60"
          style={{ background: "linear-gradient(90deg,#FF00A6,#C53DFF)", boxShadow: "0 8px 30px rgba(255,0,166,0.35)" }}
        >
          {going ? "Starting…" : "Go Live"}
        </button>
        <p className="text-center text-[11px] text-white/45">
          Your camera and mic stay off until you allow them in the browser.
        </p>
      </div>

      {auth.user && (
        <Link
          to="/artist/$id"
          params={{ id: auth.user.id }}
          className="mt-4 block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-white/70 hover:bg-white/[0.06]"
        >
          View my artist profile
        </Link>
      )}
    </div>
  );
}
