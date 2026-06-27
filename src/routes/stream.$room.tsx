import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuestLiveKitToken, getLiveKitToken } from "@/lib/livekit.functions";
import { getStreamByRoom } from "@/lib/streams.functions";
import { LiveStage } from "@/components/stream/LiveStage";
import { RaiseHandButton } from "@/components/stream/RaiseHandButton";
import { LiveChat } from "@/components/stream/LiveChat";
import { RaiseHandPanel } from "@/components/stream/RaiseHandPanel";
import { BackstageQueue } from "@/components/stream/BackstageQueue";
import { GreenRoom } from "@/components/stream/GreenRoom";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStageState, type StageParticipant } from "@/lib/useStageState";
import { AudienceRow } from "@/components/stream/StageRoom";
import { StageRoom } from "@/components/stream/StageRoom";
import { StageAudioShell } from "@/components/stream/StageAudioShell";
import { InCrowdBanner } from "@/components/stream/InCrowdBanner";
import { useStagePresence } from "@/lib/use-stage-presence";
import { PlayArenaView } from "@/routes/play.$room";

import joinBgAsset from "@/assets/bwf-join-bg.jpeg.asset.json";

export const Route = createFileRoute("/stream/$room")({
  head: () => ({ meta: [{ title: "Join Live — BWF Network" }] }),
  component: GuestPage,
});

function GuestPage() {
  const { room } = useParams({ from: "/stream/$room" });
  const tokenFn = useServerFn(getGuestLiveKitToken);
  const authTokenFn = useServerFn(getLiveKitToken);
  const streamFn = useServerFn(getStreamByRoom);
  const auth = useAuth();
  const [name, setName] = useState("");
  const [lk, setLk] = useState<{ token: string; wsUrl: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [streamMode, setStreamMode] = useState<"broadcast" | "stage" | "play">("broadcast");
  const [streamMeta, setStreamMeta] = useState<{ title: string; host_id: string; started_at: string | null } | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const { participants, hands, queue } = useStageState(lk ? streamId : null);

  // Heartbeat presence only after the listener actually joins LiveKit; avoids
  // ghost stage rows that show as “Reconnecting…” before the guest connects.
  useStagePresence(lk ? streamId : null, auth.user?.id ?? null);

  const myStageRole = auth.user
    ? participants.find((p) => p.user_id === auth.user!.id)?.stage_role ?? "listener"
    : "listener";
  const isHostLike = myStageRole === "host" || myStageRole === "co_host";
  const inCrowd = !isHostLike && myStageRole !== "speaker";

  useEffect(() => {
    streamFn({ data: { roomName: room } })
      .then((s: any) => {
        setStreamId(s?.id ?? null);
        if (s?.mode) setStreamMode(s.mode as "broadcast" | "stage" | "play");
        if (s?.id) setStreamMeta({ title: s.title ?? "", host_id: s.host_id, started_at: (s as any).started_at ?? null });
      })
      .catch(() => {});
  }, [room]);

  // Track host-side mode/lock changes
  useEffect(() => {
    if (!streamId) return;
    const ch = supabase
      .channel(`stream-mode-${streamId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "streams", filter: `id=eq.${streamId}` },
        (p) => {
          const r = p.new as any;
          // Guard: only update when the value actually changes. Without this,
          // any unrelated UPDATE on the streams row (e.g. viewer_count tick)
          // would call setStreamMode with the same value and force the entire
          // LiveKit subtree to remount on the next render, kicking guests
          // back to the audience.
          const nextMode = (r.mode ?? "broadcast") as "broadcast" | "stage" | "play";
          setStreamMode((prev) => (prev === nextMode ? prev : nextMode));
          if (typeof r.viewer_count === "number") {
            setViewerCount((prev) => (prev === r.viewer_count ? prev : r.viewer_count));
          }
        },
      )
      .subscribe();
    supabase.from("streams").select("viewer_count").eq("id", streamId).maybeSingle()
      .then(({ data }) => { if (data && typeof (data as any).viewer_count === "number") setViewerCount((data as any).viewer_count); });
    return () => { supabase.removeChannel(ch); };
  }, [streamId]);

  // Register presence on join. Preserve any existing stage_role (host/speaker/
  // green_room) — only insert as listener if there's no row yet. Do NOT delete
  // on unload: the cron cleanup removes rows after 2 minutes of inactivity, so
  // refreshes keep guest status intact without re-approval.
  useEffect(() => {
    if (!streamId || !auth.user) return;
    const uid = auth.user.id;
    (async () => {
      const { data: existing } = await supabase
        .from("stage_participants")
        .select("stage_role")
        .eq("stream_id", streamId)
        .eq("user_id", uid)
        .maybeSingle();
      if (!existing) {
        await supabase
          .from("stage_participants")
          .insert({ stream_id: streamId, user_id: uid, stage_role: "listener" });
      }
    })();
  }, [lk, streamId, auth.user?.id]);

  // Auto-rejoin: if the signed-in user already has a stage row for this
  // stream (i.e. they were on stage before refreshing), connect to LiveKit
  // immediately without re-prompting for a name.
  useEffect(() => {
    if (lk || !streamId || !auth.user) return;
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from("stage_participants")
        .select("stage_role")
        .eq("stream_id", streamId)
        .eq("user_id", auth.user!.id)
        .maybeSingle();
      if (cancelled || !existing) return;
      try {
        const t = await authTokenFn({ data: { roomName: room } });
        if (cancelled) return;
        setLk({ token: t.token, wsUrl: t.wsUrl });
        toast.success("Reconnected to the stream");
      } catch (e: any) {
        console.warn("Auto-rejoin failed", e?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [streamId, auth.user?.id]);

  const join = async () => {
    if (!name.trim()) return;
    setJoining(true);
    try {
      const t = auth.user
        ? await authTokenFn({ data: { roomName: room } })
        : await tokenFn({ data: { roomName: room, displayName: name.trim() } });
      setLk({ token: t.token, wsUrl: t.wsUrl });
    } catch (e: any) {
      toast.error(e?.message || "Failed to join");
    } finally { setJoining(false); }
  };

  if (!lk) {
    return (
      <div
        className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${joinBgAsset.url})` }}
      >
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18]/85 backdrop-blur-md p-6 shadow-2xl">
          <h1 className="text-2xl font-bold mb-1">Join the stream</h1>
          <p className="text-sm text-white/60 mb-4">Room: <span className="text-white">{room}</span></p>
          <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm mb-3" />
          <button onClick={join} disabled={joining || !name.trim()} className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
            {joining ? "Joining…" : "Join Live"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white p-4">
      <div className="mx-auto max-w-7xl grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {streamMode === "stage" && streamId && auth.user ? (
            <StageAudioShell
              token={lk.token}
              serverUrl={lk.wsUrl}
              streamId={streamId}
              userId={auth.user.id}
              onLeave={() => setLk(null)}
              showHostTools={isHostLike}
              autoConnect
            >
              <StageRoom
                streamId={streamId}
                participants={participants as StageParticipant[]}
                canManage={isHostLike}
              />
              {inCrowd && (
                <InCrowdBanner streamId={streamId} auth={auth} mode="stage" />
              )}
              {!inCrowd && (
                <div className="flex justify-center">
                  <RaiseHandButton streamId={streamId} auth={auth} />
                </div>
              )}
              <AudienceRow participants={participants as StageParticipant[]} />
            </StageAudioShell>
          ) : (
            <>
              <LiveStage token={lk.token} serverUrl={lk.wsUrl} onEnd={() => setLk(null)} onInvite={() => {}} publish={!inCrowd} streamId={streamId ?? undefined} showHostTools={isHostLike} />
              {streamId && (
                <StageRoom
                  streamId={streamId}
                  participants={participants as StageParticipant[]}
                  canManage={isHostLike}
                />
              )}
              {streamId && inCrowd && (
                <InCrowdBanner streamId={streamId} auth={auth} mode="broadcast" />
              )}
              {streamId && !inCrowd && (
                <div className="flex justify-center">
                  <RaiseHandButton streamId={streamId} auth={auth} />
                </div>
              )}
              <AudienceRow participants={participants as StageParticipant[]} />
              {streamId && streamMeta && (
                <PlayArenaView
                  stream={{ id: streamId, title: streamMeta.title, host_id: streamMeta.host_id }}
                  showChat={false}
                />
              )}
            </>
          )}
        </div>
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {streamId && (
            <LiveChat
              streamId={streamId}
              auth={auth}
              viewerCount={viewerCount}
              startedAt={streamMeta?.started_at ?? null}
              hostId={streamMeta?.host_id ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}