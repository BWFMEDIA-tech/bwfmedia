import { useEffect, useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Radio, Share2, LogOut, Users, Crown, Music2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { useAuth } from "@/lib/auth-context";
import { getGuestLiveKitToken, getLiveKitToken } from "@/lib/livekit.functions";
import { endStream, type getArtistLiveStream } from "@/lib/streams.functions";
import { useStageState } from "@/lib/useStageState";
import { useStagePresence } from "@/lib/use-stage-presence";
import { supabase } from "@/integrations/supabase/client";
import { LiveStage } from "@/components/stream/LiveStage";
import { LiveChat } from "@/components/stream/LiveChat";
import { StageRoom, AudienceRow } from "@/components/stream/StageRoom";
import { StageAudioShell } from "@/components/stream/StageAudioShell";
import { InCrowdBanner } from "@/components/stream/InCrowdBanner";
import { RaiseHandPanel } from "@/components/stream/RaiseHandPanel";
import { BackstageQueue } from "@/components/stream/BackstageQueue";

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
    <main className="artist-live-room mx-auto min-h-screen w-full max-w-6xl px-3 pb-28 pt-4 md:px-5 md:pt-5">
      <header className="mb-5 flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <span className="inline-flex items-center gap-2 rounded-md bg-trust px-3 py-2 text-xs font-bold text-accent-foreground"><Radio className="h-4 w-4" /> LIVE</span>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-lg font-semibold text-foreground">{artist.name}</h1>
          <p className="break-words text-xs text-muted-foreground">{stream.title}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-brand-silver"><Eye className="h-4 w-4" /> {viewers.toLocaleString()}</span>
        <Button variant="outline" size="sm" onClick={share}><Share2 /> Share</Button>
        {connection && <Button variant="ghost" size="icon" title="Leave room" aria-label="Leave room" onClick={() => setConnection(null)}><LogOut /></Button>}
      </header>

      {connection ? (
        <div className="artist-live-stage flex min-w-0 flex-col gap-4">
          {stream.mode === "stage" && auth.user ? (
            <StageAudioShell token={connection.token} serverUrl={connection.wsUrl} streamId={stream.id} userId={auth.user.id} autoConnect showHostTools={canManage} onLeave={() => setConnection(null)}>
              <StageRoom streamId={stream.id} participants={participants} canManage={canManage} />
            </StageAudioShell>
          ) : (
            <LiveStage token={connection.token} serverUrl={connection.wsUrl} streamId={stream.id} hostImage={artist.photo ?? undefined} publish={onStage} showHostTools={onStage} onEnd={() => { void stop(); }} onInvite={() => { void invite(); }} />
          )}
        </div>
      ) : (
        <section className="grid min-w-0 gap-5 border-b border-border pb-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
          <div className="relative aspect-square max-h-96 overflow-hidden rounded-lg bg-card">
            {artist.photo ? <SignedImg src={artist.photo} alt={artist.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><Music2 className="h-20 w-20" /></div>}
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-background/80 px-3 py-2 text-xs text-foreground"><Crown className="h-4 w-4 text-primary" /> Host</span>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">{artist.name} is live</h2>
            {!auth.user && <input aria-label="Your live-room name" placeholder="Your name (optional)" value={guestName} maxLength={80} onChange={(event) => setGuestName(event.target.value)} className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground" />}
            <Button size="lg" className="w-full" disabled={joining || auth.loading} onClick={join}><Radio /> {joining ? "Joining…" : isOwner ? "Resume live" : "Watch live"}</Button>
            {isOwner && <Button variant="outline" className="w-full" disabled={ending} onClick={stop}>{ending ? "Ending…" : "End live"}</Button>}
          </div>
        </section>
      )}

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="artist-live-chat min-w-0">
          <LiveChat streamId={stream.id} auth={auth} viewerCount={viewers} startedAt={stream.started_at} hostId={stream.host_id} status="live" />
        </div>
        <aside className="artist-live-sidebar min-w-0 space-y-4">
          <section className="border-b border-border pb-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4 text-primary" /> Audience <span className="ml-auto text-muted-foreground">{viewers.toLocaleString()}</span></h2>
            {participants.some((p) => p.stage_role === "listener" || p.stage_role === "green_room") ? <AudienceRow participants={participants} /> : <p className="text-sm text-muted-foreground">{connection ? "No audience members yet." : "Join to see the audience."}</p>}
          </section>
          {connection && !onStage && <InCrowdBanner streamId={stream.id} auth={auth} mode={stream.mode === "stage" ? "stage" : "broadcast"} />}
          {connection && canManage && <>
            <RaiseHandPanel streamId={stream.id} hands={hands} />
            <BackstageQueue streamId={stream.id} queue={queue} canManage />
            <details><summary className="cursor-pointer py-3 text-sm font-semibold text-primary">Manage stage</summary><StageRoom streamId={stream.id} participants={participants} canManage /></details>
          </>}
          {!auth.isAuthenticated && <Button asChild variant="outline" className="w-full"><Link to="/login">Sign in to chat and support</Link></Button>}
        </aside>
      </div>
    </main>
  );
}