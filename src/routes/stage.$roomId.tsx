import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getStageRoom, setStageStatus } from "@/lib/stage-rooms.functions";
import { Mic, MicOff, Video, MessageSquare, Settings, Hand, Radio, LogOut, Users } from "lucide-react";

export const Route = createFileRoute("/stage/$roomId")({
  head: () => ({
    meta: [
      { title: "Stage Room — BWF Network" },
      { name: "description", content: "Interactive live stage with hosts, artists, and audience." },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-screen place-items-center bg-black text-white p-8">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-bold">Stage unavailable</h1>
        <p className="mb-4 text-sm text-white/60">{(error as Error).message}</p>
        <button onClick={reset} className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-black text-white">
      <p>Stage room not found.</p>
    </div>
  ),
  component: StagePage,
});

function useElapsed(startedAt: string | null | undefined, live: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live || !startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live, startedAt]);
  return useMemo(() => {
    if (!startedAt) return "00:00:00";
    const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [now, startedAt]);
}

function shortId(id: string) {
  return `BWF-${id.slice(0, 4).toUpperCase()}-${id.slice(-3).toUpperCase()}`;
}

function StagePage() {
  const { roomId } = Route.useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const updateStatus = useServerFn(setStageStatus);
  const fetchRoom = useServerFn(getStageRoom);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.user) {
      navigate({ to: "/login", search: { redirect: `/stage/${roomId}` } as never });
    }
  }, [auth.user, navigate, roomId]);

  const { data: room, isLoading, error } = useQuery({
    queryKey: ["stage-room", roomId],
    queryFn: () => fetchRoom({ data: { id: roomId } }),
    enabled: !!auth.user,
  });

  const isHost = !!room && auth.user?.id === room.host_id;
  const isLive = room?.status === "live";
  const isEnded = room?.status === "ended";
  const elapsed = useElapsed(room?.started_at, !!isLive);

  if (!auth.user) return null;
  if (isLoading || !room) {
    return (
      <div className="min-h-screen grid place-items-center bg-black text-white">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/40">
          <div className="w-2 h-2 rounded-full bg-[#C53DFF] animate-pulse" />
          {error ? "Stage unavailable" : "Loading stage…"}
        </div>
      </div>
    );
  }

  const statusTone = isLive
    ? { dot: "bg-[#FF00A6]", text: "text-[#FF00A6]", border: "border-[#FF00A6]/40", bg: "bg-[#FF00A6]/10", label: "On-Air" }
    : isEnded
      ? { dot: "bg-white/40", text: "text-white/60", border: "border-white/15", bg: "bg-white/5", label: "Ended" }
      : { dot: "bg-[#00E6FF]", text: "text-[#00E6FF]", border: "border-[#00E6FF]/40", bg: "bg-[#00E6FF]/10", label: "Standby" };

  const hostLabel = isHost ? "You · Lead Host" : "Lead Host";
  const hostInitial = (auth.user.email ?? "H").slice(0, 1).toUpperCase();

  const goLive = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await updateStatus({ data: { id: room.id, status: "live" } });
      navigate({ to: "/stage/$roomId", params: { roomId: room.id } });
    } finally {
      setBusy(false);
    }
  };

  const endStage = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await updateStatus({ data: { id: room.id, status: "ended" } });
      navigate({ to: "/stream-studio" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-black text-white flex items-center justify-center p-4 lg:p-8"
      style={{ fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="relative w-full max-w-7xl min-h-[88vh] bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(197,61,255,0.08)] flex flex-col">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 bg-[#C53DFF]/20 blur-[100px] rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 bg-[#004BFF]/20 blur-[100px] rounded-full" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 lg:px-10 py-5 lg:py-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 px-3 py-1 ${statusTone.bg} border ${statusTone.border} rounded-full`}>
              <div className={`w-2 h-2 ${statusTone.dot} rounded-full ${isLive ? "animate-pulse" : ""}`} />
              <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${statusTone.text}`}>{statusTone.label}</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-medium">Stage Session</span>
              <span className="text-xs font-mono text-[#00E6FF] tracking-tighter">{shortId(room.id)}</span>
            </div>
          </div>

          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 flex-col items-center">
            <span className="max-w-[40ch] truncate text-xs font-bold tracking-[0.4em] uppercase text-white/80">
              {room.title || "Interactive Stage"}
            </span>
            <span className="text-[10px] text-[#C53DFF] font-mono mt-1">
              {isLive ? `${elapsed} ELAPSED` : isEnded ? "SESSION ENDED" : "AWAITING HOST"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-[9px] text-white/40 uppercase tracking-widest">Audience</span>
              <span className="text-xl font-bold text-white tabular-nums">
                {(room.audience_count ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="hidden sm:flex w-10 h-10 rounded-xl border border-white/10 items-center justify-center bg-white/5">
              <Users className="w-5 h-5 text-white/60" />
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="relative flex-1 flex flex-col lg:flex-row gap-6 p-5 lg:p-8 overflow-hidden">
          {/* Queue rail */}
          <div className="lg:w-16 flex lg:flex-col gap-5 items-center justify-between lg:justify-start py-3 lg:py-4 px-3 lg:px-0 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex lg:flex-col gap-4 items-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#FF00A6] p-0.5 shadow-[0_0_18px_rgba(255,0,166,0.35)]">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FF00A6]/40 to-[#C53DFF]/30 flex items-center justify-center text-[10px] font-bold">
                  {hostInitial}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full border border-white/15 p-0.5 opacity-60">
                <div className="w-full h-full rounded-full bg-white/5" />
              </div>
              <div className="w-10 h-10 rounded-full border border-white/15 p-0.5 opacity-40">
                <div className="w-full h-full rounded-full bg-white/5" />
              </div>
            </div>
            <button
              className="w-12 h-12 rounded-full bg-[#FF00A6]/20 border border-[#FF00A6]/50 flex items-center justify-center text-[#FF00A6] shadow-[0_0_20px_rgba(255,0,166,0.2)] hover:scale-105 transition-transform"
              aria-label="Raise hand"
            >
              <Hand className="w-5 h-5" />
            </button>
          </div>

          {/* Stage */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 min-h-[420px]">
              {/* Lead host tile */}
              <div className="md:col-span-3 md:row-span-2 relative rounded-3xl overflow-hidden border border-white/10 group bg-gradient-to-br from-[#1a0a2a] via-black to-[#0a0a1f]">
                <div className="absolute inset-0 opacity-50 [background:radial-gradient(60%_50%_at_30%_40%,rgba(197,61,255,0.35),transparent_60%),radial-gradient(50%_45%_at_75%_70%,rgba(0,75,255,0.3),transparent_60%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <div className="absolute inset-0 border-2 border-[#C53DFF]/30 group-hover:border-[#C53DFF]/60 transition-colors pointer-events-none rounded-3xl" />

                {!isLive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                      <Mic className="w-7 h-7 text-white/60" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                      {isEnded ? "This stage has wrapped" : "Stage is in standby"}
                    </p>
                    {isHost && !isEnded && (
                      <p className="text-xs text-white/60 max-w-sm">
                        Hit <span className="text-[#C53DFF] font-semibold">Go Live</span> below to open the room to your audience.
                      </p>
                    )}
                  </div>
                )}

                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl border-2 border-[#C53DFF] overflow-hidden rotate-3 shadow-[0_0_20px_rgba(197,61,255,0.4)] flex items-center justify-center bg-gradient-to-br from-[#C53DFF]/50 to-[#004BFF]/40 text-lg font-bold">
                      {hostInitial}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl lg:text-2xl font-bold tracking-tight truncate">
                        {room.title || "Untitled Stage"}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#C53DFF]/20 text-[#C53DFF] text-[9px] font-bold tracking-widest uppercase rounded border border-[#C53DFF]/30">
                          {hostLabel}
                        </span>
                        <span className="text-white/40 text-[10px] font-mono tracking-wide truncate">
                          {room.livekit_room}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {isLive && (
                  <div className="absolute top-6 right-6">
                    <div className="flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl">
                      <div className="flex gap-1 items-end h-4 w-6">
                        <div className="w-1 bg-[#00E6FF] animate-[bounce_0.8s_infinite]" style={{ height: "40%" }} />
                        <div className="w-1 bg-[#00E6FF] animate-[bounce_1.2s_infinite]" style={{ height: "90%" }} />
                        <div className="w-1 bg-[#00E6FF] animate-[bounce_1s_infinite]" style={{ height: "60%" }} />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest text-[#00E6FF]">AUDIO MASTER</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Empty stage seats */}
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="relative rounded-2xl overflow-hidden border border-dashed border-white/10 bg-white/[0.03] min-h-[140px] flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30">
                    <Mic className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                    Open Seat
                  </span>
                </div>
              ))}
            </div>

            {/* Audience strip */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex -space-x-3">
                {[
                  "from-[#C53DFF] to-[#FF00A6]",
                  "from-[#00E6FF] to-[#004BFF]",
                  "from-[#FF00A6] to-[#004BFF]",
                ].map((g, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ring-2 ring-black bg-gradient-to-br ${g}`}
                  />
                ))}
                <div className="w-auto px-3 h-8 rounded-full ring-2 ring-black bg-[#C53DFF] flex items-center justify-center text-[10px] font-bold tabular-nums">
                  +{Math.max(0, (room.audience_count ?? 0) - 3).toLocaleString()}
                </div>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">Room</span>
                <span className="text-[10px] font-mono text-[#00E6FF] truncate max-w-[22ch]">
                  {room.livekit_room}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cockpit controls */}
        <div className="relative px-6 lg:px-10 py-6 lg:py-8 bg-gradient-to-t from-white/5 to-transparent border-t border-white/10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-3">
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl border flex items-center justify-center transition-all ${muted ? "bg-[#FF00A6]/15 border-[#FF00A6]/50 text-[#FF00A6]" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-[#00E6FF]/50 hover:text-[#00E6FF]"}`}
              >
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setCamOff((c) => !c)}
                aria-label={camOff ? "Turn camera on" : "Turn camera off"}
                className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl border flex items-center justify-center transition-all ${camOff ? "bg-white/5 border-white/10 text-white/40" : "bg-[#00E6FF]/15 border-[#00E6FF]/50 text-[#00E6FF]"}`}
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                aria-label="Chat"
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:border-[#00E6FF]/50 hover:text-[#00E6FF] transition-all"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>

            <div className="hidden md:flex flex-col items-center order-3 md:order-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1 h-1 rounded-full bg-[#004BFF]" />
                <div className="w-1 h-1 rounded-full bg-[#C53DFF]" />
                <div className="w-1 h-1 rounded-full bg-[#FF00A6]" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-[0.5em] text-white/20">
                BWF Cockpit Control
              </span>
            </div>

            <div className="flex gap-3 order-2 md:order-3">
              {isHost && !isEnded && (
                isLive ? (
                  <button
                    onClick={endStage}
                    disabled={busy}
                    className="px-6 py-3 lg:py-4 bg-white/5 border border-white/10 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    End Stage
                  </button>
                ) : (
                  <button
                    onClick={goLive}
                    disabled={busy}
                    className="px-6 py-3 lg:py-4 bg-[#C53DFF] rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-[0_0_40px_rgba(197,61,255,0.3)] hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Radio className="w-3.5 h-3.5" /> Go Live
                  </button>
                )
              )}
              <button
                aria-label="Stage settings"
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate({ to: "/stream-studio" })}
                className="px-6 py-3 lg:py-4 bg-[#FF00A6] rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-[0_0_40px_rgba(255,0,166,0.3)] hover:scale-105 transition-all flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" /> Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}