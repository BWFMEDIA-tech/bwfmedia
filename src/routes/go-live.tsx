import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radio, Copy, Check, Users, Headphones, Music2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { startOrResumeStream, endStream, getMyActiveStream } from "@/lib/streams.functions";
import { getLiveKitToken } from "@/lib/livekit.functions";
import { LiveStage } from "@/components/stream/LiveStage";
import { LiveChat } from "@/components/stream/LiveChat";
import { AudienceRow, StageRoom } from "@/components/stream/StageRoom";
import { updateStreamMode } from "@/lib/stage.functions";
import { useStageState } from "@/lib/useStageState";
import { LIVE_CATEGORIES } from "@/lib/live-categories";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { IDENTITY_COLUMNS, effectiveIdentity } from "@/lib/host-identity";

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
  const [artist, setArtist] = useState<{ name: string; photo: string | null }>({ name: "", photo: null });
  const { participants } = useStageState(stream?.id ?? null);
  const updateModeFn = useServerFn(updateStreamMode);
  const [podcast, setPodcast] = useState(false);
  const switchMode = async (next: boolean) => {
    setPodcast(next);
    if (!stream) return;
    try {
      await updateModeFn({ data: { streamId: stream.id, mode: next ? "stage" : "broadcast" } });
      toast.success(next ? "Podcast mode: audio only" : "Music Review mode: video on");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't switch mode");
    }
  };

  useEffect(() => {
    const userId = auth.user?.id;
    if (!userId) return;
    let cancelled = false;
    void supabase.from("profiles").select(IDENTITY_COLUMNS).eq("id", userId).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const identity = effectiveIdentity(data);
      setArtist({ name: identity.display_name ?? "", photo: identity.avatar_url });
    });
    return () => { cancelled = true; };
  }, [auth.user?.id]);

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

  const shareUrl = stream && auth.user ? `${typeof window !== "undefined" ? window.location.origin : ""}/artist/${auth.user.id}` : "";

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

  if (stream && lk && auth.user) {
    return (
      <main className="artist-live-room mx-auto w-full max-w-5xl px-3 pb-24 pt-4 text-foreground md:px-4">
          <header className="live-header mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3">
            <div className="flex min-w-0 flex-auto items-center gap-3">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-trust px-3 py-1.5 text-xs font-bold text-accent-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-foreground" /> LIVE
            </span>
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary bg-card text-primary">
              {artist.photo ? <SignedImg src={artist.photo} alt={artist.name} className="h-full w-full object-cover" /> : <Radio className="h-5 w-5" />}
            </div>
            <div className="min-w-0"><h1 className="truncate text-sm font-semibold">{stream.title}</h1><p className="truncate text-xs text-muted-foreground">{artist.name}</p></div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground"><Users className="h-4 w-4" />{viewerCount}</span>
              <Button variant="outline" size="sm" onClick={copyLink} aria-label="Share live profile">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Share link
              </Button>
            </div>
          </header>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <Button variant={podcast ? "outline" : "default"} onClick={() => switchMode(false)} aria-pressed={!podcast}>
                <Music2 className="h-4 w-4" /> Music Review
              </Button>
              <Button variant={podcast ? "default" : "outline"} onClick={() => switchMode(true)} aria-pressed={podcast}>
                <Headphones className="h-4 w-4" /> Podcast
              </Button>
            </div>
            <div className="artist-live-stage min-w-0">
              <LiveStage
                audioOnly={podcast}
                token={lk.token}
                serverUrl={lk.wsUrl}
                streamId={stream.id}
                onEnd={stopLive}
                onInvite={async () => {
                  try { await navigator.clipboard.writeText(`${window.location.origin}/invite/${stream.room_name}`); toast.success("Guest invite link copied"); }
                  catch { toast.error("Could not copy invite link"); }
                }}
                onViewerCount={setViewerCount}
                profileHost={{ id: auth.user.id, name: artist.name, photo: artist.photo }}
              />
            </div>
            <section className="mt-5 min-w-0">
              <StageRoom
                streamId={stream.id}
                participants={participants}
                canManage
                primaryHostId={auth.user.id}
                selfProfile={{ user_id: auth.user.id, display_name: artist.name, avatar_url: artist.photo }}
              />
            </section>
            <div className="profile-room-content artist-live-chat mt-5 min-w-0">
              <LiveChat
                streamId={stream.id}
                auth={auth}
                viewerCount={viewerCount}
                startedAt={startedAt}
                hostId={auth.user?.id ?? null}
                status="live"
                profileLayout
              />
              <section className="mt-4 border-b border-border pb-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4 text-primary" /> Audience <span className="ml-auto text-muted-foreground">{viewerCount.toLocaleString()}</span></h2>
                {participants.some((p) => p.stage_role === "listener" || p.stage_role === "green_room") ? <AudienceRow participants={participants} /> : <p className="text-sm text-muted-foreground">No audience members yet.</p>}
              </section>
            </div>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6 text-white md:max-w-xl md:pt-10">
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-xl"
          style={{ background: "linear-gradient(135deg, rgba(0,0,255,0.3), rgba(0,0,255,0.25))", border: "1px solid rgba(255,255,255,0.08)" }}
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
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[#0000FF]/60"
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
                    ? "border-[#0000FF] bg-[#0000FF]/20 text-white"
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
          style={{ background: "linear-gradient(90deg,#00E6FF,#0000FF)", boxShadow: "0 8px 30px rgba(0,0,255,0.35)" }}
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
