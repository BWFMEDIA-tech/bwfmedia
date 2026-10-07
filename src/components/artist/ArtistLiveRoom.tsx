import { useEffect, useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Radio, Share2, LogOut, Users, Crown, Music2, MoreHorizontal, Heart, Gem, Hand, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { useAuth } from "@/lib/auth-context";
import { getGuestLiveKitToken, getLiveKitToken } from "@/lib/livekit.functions";
import { endStream, type getArtistLiveStream } from "@/lib/streams.functions";
import { useStageState } from "@/lib/useStageState";
import { useStagePresence } from "@/lib/use-stage-presence";
import { supabase } from "@/integrations/supabase/client";
import { LiveStage, ProfileStage, CameraPublishSync } from "@/components/stream/LiveStage";
import { LiveChat } from "@/components/stream/LiveChat";
import { StageRoom, AudienceRow } from "@/components/stream/StageRoom";
import { StageAudioShell } from "@/components/stream/StageAudioShell";
import { InCrowdBanner } from "@/components/stream/InCrowdBanner";
import { RaiseHandPanel } from "@/components/stream/RaiseHandPanel";
import { BackstageQueue } from "@/components/stream/BackstageQueue";
import { TipModal } from "@/components/stream/TipModal";

type LiveStream = NonNullable<Awaited<ReturnType<typeof getArtistLiveStream>>>;

export function ArtistLiveRoom({ stream, artist, onEnded }: {
  stream: LiveStream;
  artist: { name: string; photo: string | null };
  onEnded: () => void;
}) {
  const auth = useAuth();
  const authToken = useServerFn(getLiveKitToken);
  const guestToken = useServerFn(getGuestLiveKitToken);
  const endLive = useServerFn(endStream);
  const [connection, setConnection] = useState<{ token: string; wsUrl: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showAudience, setShowAudience] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [viewers, setViewers] = useState(stream.viewer_count ?? 0);
  const topicId = useId();
  const { participants, hands, queue } = useStageState(connection ? stream.id : null);
  const isOwner = auth.user?.id === stream.host_id;
  const myRole = participants.find((p) => p.user_id === auth.user?.id)?.stage_role;
  const canManage = isOwner;
  const onStage = isOwner || myRole === "host" || myRole === "co_host" || myRole === "speaker";
  useStagePresence(connection ? stream.id : null, auth.user?.id ?? null);

  useEffect(() => { setViewers(stream.viewer_count ?? 0); }, [stream.viewer_count]);
  useEffect(() => {
    const channel = supabase.channel(`artist-live-${stream.id}-${topicId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "streams", filter: `id=eq.${stream.id}` }, ({ new: row }) => {
        if (row.status === "ended") onEnded();
        if (typeof row.viewer_count === "number") setViewers(row.viewer_count);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [stream.id, topicId, onEnded]);

  const join = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const token = auth.user
        ? await authToken({ data: { roomName: stream.room_name } })
        : await guestToken({ data: { roomName: stream.room_name, displayName: guestName.trim() || "Viewer" } });
      setConnection({ token: token.token, wsUrl: token.wsUrl });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join live");
    } finally { setJoining(false); }
  };
  const share = async () => {
    const url = `${window.location.origin}/artist/${stream.host_id}`;
    try {
      if (navigator.share) await navigator.share({ title: stream.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Live profile link copied"); }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) toast.error("Could not share the link");
    }
  };
  const invite = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/invite/${stream.room_name}`); toast.success("Guest invite link copied"); }
    catch { toast.error("Could not copy invite link"); }
  };
  const stop = async () => {
    if (!isOwner) { setConnection(null); return; }
    if (!window.confirm("End this live stream for everyone?")) return;
    setEnding(true);
    try { await endLive({ data: { streamId: stream.id } }); setConnection(null); onEnded(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not end live"); }
    finally { setEnding(false); }
  };

  return (
    <main className="artist-live-room mx-auto w-full max-w-5xl px-3 pb-5 pt-4 md:px-4 md:pt-4">
      <header className="mb-5 flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <span className="inline-flex items-center gap-2 rounded-md bg-trust px-4 py-2 text-sm font-bold text-accent-foreground">LIVE</span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-sm font-medium text-foreground"><span className="h-2 w-2 shrink-0 rounded-full bg-primary" />{artist.name} · Live Room</h1>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-brand-silver"><Eye className="h-4 w-4" /> {viewers.toLocaleString()}</span>
        <Button variant="outline" size="sm" onClick={share}><Share2 /> Share</Button>
        <div className="relative"><Button variant="outline" size="icon" aria-label="Room options" onClick={() => setShowMenu(v => !v)}><MoreHorizontal /></Button>{showMenu && <div className="absolute right-0 top-12 z-20 w-48 rounded-lg border border-border bg-card p-2"><p className="px-2 py-2 text-xs text-muted-foreground">{stream.title}</p><Button variant="ghost" className="w-full" onClick={() => { setShowAudience(v => !v); setShowMenu(false); }}>Toggle audience</Button></div>}</div>
        {connection && <Button variant="ghost" size="icon" title="Leave room" aria-label="Leave room" onClick={() => setConnection(null)}><LogOut /></Button>}
      </header>

      {connection ? (
        <div className="artist-live-stage flex min-w-0 flex-col gap-4">
          {stream.mode === "stage" && auth.user ? (
            <StageAudioShell token={connection.token} serverUrl={connection.wsUrl} streamId={stream.id} userId={auth.user.id} autoConnect showHostTools={canManage} onLeave={() => setConnection(null)}>
              <ProfileStage host={{ id: stream.host_id, name: artist.name, photo: artist.photo }} streamId={stream.id} publish={onStage} showHostTools={canManage} onEnd={() => { void stop(); }} onInvite={() => { void invite(); }} />
              <CameraPublishSync publish={onStage} />
            </StageAudioShell>
          ) : (
            <LiveStage token={connection.token} serverUrl={connection.wsUrl} streamId={stream.id} hostImage={artist.photo ?? undefined} profileHost={{ id: stream.host_id, name: artist.name, photo: artist.photo }} publish={onStage} showHostTools={canManage} onEnd={() => { void stop(); }} onInvite={() => { void invite(); }} />
          )}
        </div>
      ) : (
        <section className="profile-entry-stage">
          <div className="profile-video-grid">
          <div className="profile-video-tile">
            {artist.photo ? <SignedImg src={artist.photo} alt={artist.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><Music2 className="h-20 w-20" /></div>}
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-background/80 px-3 py-2 text-xs text-foreground"><Crown className="h-4 w-4 text-primary" /> Host</span>
            <div className="profile-video-identity"><p className="text-sm font-semibold">{artist.name}</p></div>
          </div>
          {["Artist", "Guest"].map(label => <div key={label} className="profile-video-tile"><span className="profile-video-badge"><Users className="h-4 w-4" />{label}</span><div className="profile-video-empty"><Users className="h-10 w-10" /><span>Join to watch live</span></div></div>)}
          </div>
          <div className="profile-entry-actions">
            {!auth.user && <input aria-label="Your live-room name" placeholder="Your name (optional)" value={guestName} maxLength={80} onChange={(event) => setGuestName(event.target.value)} className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground" />}
            <Button size="lg" className="w-full" disabled={joining || auth.loading} onClick={join}><Radio /> {joining ? "Joining…" : isOwner ? "Resume live" : "Watch live"}</Button>
            {isOwner && <Button variant="outline" className="w-full" disabled={ending} onClick={stop}>{ending ? "Ending…" : "End live"}</Button>}
          </div>
        </section>
      )}

      <div className="profile-room-content mt-5 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.27fr)_minmax(0,1fr)]">
        <div className="artist-live-chat min-w-0">
          <LiveChat streamId={stream.id} auth={auth} viewerCount={viewers} startedAt={stream.started_at} hostId={stream.host_id} status="live" profileLayout />
        </div>
        <aside className="artist-live-sidebar min-w-0 space-y-4">
          {showAudience && <section className="border-b border-border pb-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4 text-primary" /> Audience <span className="ml-auto text-muted-foreground">{viewers.toLocaleString()}</span></h2>
            {participants.some((p) => p.stage_role === "listener" || p.stage_role === "green_room") ? <AudienceRow participants={participants} /> : <p className="text-sm text-muted-foreground">{connection ? "No audience members yet." : "Join to see the audience."}</p>}
          </section>}
          <section><h2 className="mb-4 text-sm font-medium">This live</h2><div className="flex items-center gap-3"><Radio className="h-5 w-5 text-primary" /><div className="min-w-0"><p className="break-words text-sm">{stream.title}</p><p className="mt-1 text-xs text-muted-foreground">{artist.name}</p></div></div>{stream.started_at && <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Started {new Date(stream.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}</section>
          <section><h2 className="mb-3 text-sm font-medium">Support the artist</h2><div className="flex items-center gap-3"><Gem className="h-8 w-8 text-primary" /><div><p className="text-sm">{artist.name}</p><p className="mt-1 text-xs text-muted-foreground">Send a tip</p></div><Button variant="outline" className="ml-auto" onClick={() => setShowTip(true)}>Tip</Button></div></section>
          {connection && !onStage && <InCrowdBanner streamId={stream.id} auth={auth} mode={stream.mode === "stage" ? "stage" : "broadcast"} />}
          {connection && canManage && <>
            <RaiseHandPanel streamId={stream.id} hands={hands} />
            <BackstageQueue streamId={stream.id} queue={queue} canManage />
            <details><summary className="cursor-pointer py-3 text-sm font-semibold text-primary">Manage stage</summary><StageRoom streamId={stream.id} participants={participants} canManage /></details>
          </>}
          {!auth.isAuthenticated && <Button asChild variant="outline" className="w-full"><Link to="/login">Sign in to chat and support</Link></Button>}
        </aside>
      </div>
      <nav aria-label="Live room actions" className="profile-action-dock">
        <Button variant="ghost" onClick={() => document.querySelector<HTMLInputElement>('[aria-label="Live comment"]')?.focus()}><MessageCircle />Comment</Button>
        <Button variant="ghost" onClick={() => document.querySelector('.profile-chat-reactions')?.scrollIntoView({ behavior: "smooth", block: "center" })}><Heart />Reactions</Button>
        <Button variant="outline" className="profile-tip-action" onClick={() => setShowTip(true)}><Gem />Tip</Button>
        {connection && !onStage && <Button variant="ghost" onClick={() => document.querySelector('.artist-live-sidebar')?.scrollIntoView({ behavior: "smooth", block: "center" })}><Hand />Request</Button>}
        <Button variant="ghost" onClick={share}><Share2 />Share</Button>
      </nav>
      {showTip && <TipModal streamId={stream.id} artistId={stream.host_id} auth={auth} onClose={() => setShowTip(false)} />}
    </main>
  );
}