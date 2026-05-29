import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuestLiveKitToken } from "@/lib/livekit.functions";
import { getStreamByRoom } from "@/lib/streams.functions";
import { LiveStage } from "@/components/stream/LiveStage";
import { RaiseHandButton } from "@/components/stream/RaiseHandButton";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStageState, type StageParticipant } from "@/lib/useStageState";
import { AudienceRow } from "@/components/stream/StageRoom";
import { StageRoom } from "@/components/stream/StageRoom";
import { StageAudioShell } from "@/components/stream/StageAudioShell";

export const Route = createFileRoute("/stream/$room")({
  head: () => ({ meta: [{ title: "Join Live — BWF Network" }] }),
  component: GuestPage,
});

function GuestPage() {
  const { room } = useParams({ from: "/stream/$room" });
  const tokenFn = useServerFn(getGuestLiveKitToken);
  const streamFn = useServerFn(getStreamByRoom);
  const auth = useAuth();
  const [name, setName] = useState("");
  const [lk, setLk] = useState<{ token: string; wsUrl: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [streamMode, setStreamMode] = useState<"broadcast" | "stage">("broadcast");
  const { participants } = useStageState(lk ? streamId : null);

  useEffect(() => {
    streamFn({ data: { roomName: room } })
      .then((s: any) => {
        setStreamId(s?.id ?? null);
        if (s?.mode) setStreamMode(s.mode as "broadcast" | "stage");
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
          setStreamMode((r.mode ?? "broadcast") as "broadcast" | "stage");
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [streamId]);

  // Auto-join as listener while in the room; remove on leave.
  useEffect(() => {
    if (!lk || !streamId || !auth.user) return;
    const uid = auth.user.id;
    supabase
      .from("stage_participants")
      .upsert(
        { stream_id: streamId, user_id: uid, stage_role: "listener" },
        { onConflict: "stream_id,user_id" },
      )
      .then(() => {});
    const handleUnload = () => {
      supabase
        .from("stage_participants")
        .delete()
        .eq("stream_id", streamId)
        .eq("user_id", uid);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [lk, streamId, auth.user?.id]);

  const join = async () => {
    if (!name.trim()) return;
    setJoining(true);
    try {
      const t = await tokenFn({ data: { roomName: room, displayName: name.trim() } });
      setLk({ token: t.token, wsUrl: t.wsUrl });
    } catch (e: any) {
      toast.error(e?.message || "Failed to join");
    } finally { setJoining(false); }
  };

  if (!lk) {
    return (
      <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
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
      <div className="mx-auto max-w-5xl flex flex-col gap-4">
        {streamMode === "stage" && streamId && auth.user ? (
          <StageAudioShell
            token={lk.token}
            serverUrl={lk.wsUrl}
            streamId={streamId}
            userId={auth.user.id}
            onLeave={() => setLk(null)}
          >
            <StageRoom streamId={streamId} participants={participants as StageParticipant[]} canManage={false} />
            <div className="flex justify-center">
              <RaiseHandButton streamId={streamId} auth={auth} />
            </div>
            <AudienceRow participants={participants as StageParticipant[]} />
          </StageAudioShell>
        ) : (
          <>
            <LiveStage token={lk.token} serverUrl={lk.wsUrl} onEnd={() => setLk(null)} onInvite={() => {}} />
            {streamId && (
              <div className="flex justify-center">
                <RaiseHandButton streamId={streamId} auth={auth} />
              </div>
            )}
            <AudienceRow participants={participants as StageParticipant[]} />
          </>
        )}
      </div>
    </div>
  );
}