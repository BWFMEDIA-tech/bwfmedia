import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Radio, Music } from "lucide-react";
import { listLiveStreams } from "@/lib/live-broadcast.functions";

export const Route = createFileRoute("/play/")({
  head: () => ({ meta: [
    { title: "BWFPLAY — Live Music Arena" },
    { name: "description", content: "Vote on live tracks, boost your song, win the weekly crown." },
  ] }),
  component: PlayIndex,
});

function PlayIndex() {
  const fn = useServerFn(listLiveStreams);
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fn({ data: { limit: 20 } }).then((r) => { setStreams(r.streams); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (!loading && streams.length === 1) {
    return <Navigate to="/play/$room" params={{ room: streams[0].room_name }} />;
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white pt-24 pb-12 px-4">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">BWFPLAY — Live Arenas</h1>
        <p className="text-white/60 mb-8">Pick a live room to vote on tracks, boost songs, and crown the winner.</p>
        {loading ? <p className="text-white/50">Loading…</p>
          : streams.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-16 text-center">
              <Radio className="mx-auto h-10 w-10 text-white/30 mb-3" />
              <p className="text-white/60">No live arenas right now.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {streams.map((s) => (
                <Link key={s.id} to="/play/$room" params={{ room: s.room_name }}
                  className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4 hover:border-violet-500/60 transition">
                  <div className="flex items-center gap-2 text-violet-300 mb-2"><Music className="h-4 w-4" /><span className="text-xs font-bold tracking-widest">LIVE</span></div>
                  <div className="font-bold">{s.title}</div>
                  <div className="text-xs text-white/50 mt-1">{s.host?.stage_name || s.host?.display_name || "BWF host"}</div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}