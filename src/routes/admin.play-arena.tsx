import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AdminShell } from "@/components/admin/AdminShell";
import { Mic2, ArrowLeft, ExternalLink, Play, Trophy, Music2 } from "lucide-react";

export const Route = createFileRoute("/admin/play-arena")({
  head: () => ({
    meta: [
      { title: "Play Arena — Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayArenaAdminPage,
});

type Row = {
  id: string;
  stream_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  current_track_id: string | null;
  winner_track_id: string | null;
  stream?: { title: string | null; host_id: string; status: string; room_name: string } | null;
  track_count?: number;
};

function PlayArenaAdminPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const isAdmin = auth.roles.includes("admin");
  const [tab, setTab] = useState<"live" | "ended" | "all">("live");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.loading && !auth.rolesLoading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, auth.rolesLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("play_sessions")
      .select("id,stream_id,status,started_at,ended_at,current_track_id,winner_track_id,streams(title,host_id,status,room_name)")
      .order("started_at", { ascending: false })
      .limit(200);
    if (tab === "live") q = q.eq("status", "active");
    if (tab === "ended") q = q.eq("status", "ended");
    const { data } = await q;
    const sessions = (data as any[]) ?? [];
    const ids = sessions.map((s) => s.stream_id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: tracks } = await supabase
        .from("play_tracks")
        .select("stream_id")
        .in("stream_id", ids);
      for (const t of (tracks as any[]) ?? []) {
        counts[t.stream_id] = (counts[t.stream_id] ?? 0) + 1;
      }
    }
    setRows(
      sessions.map((s) => ({ ...s, stream: s.streams, track_count: counts[s.stream_id] ?? 0 })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, tab]);

  if (auth.loading || !isAdmin) return null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Control Center
        </Link>
        <h1 className="mt-4 text-3xl font-bold flex items-center gap-3">
          <Mic2 className="h-7 w-7 text-fuchsia-400" /> Play Arena
        </h1>
        <p className="mt-1 text-sm text-white/50">Live mic-drop sessions, queued tracks, and battle outcomes.</p>

        <div className="mt-6 flex gap-2">
          {(["live", "ended", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/40" : "text-white/60 hover:text-white"
              }`}
            >
              {t === "live" ? "Active" : t === "ended" ? "Ended" : "All"}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {loading ? (
            <div className="p-8 text-center text-sm text-white/50">Loading sessions…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/50">No sessions in this view.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-3">Show</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tracks</th>
                  <th className="px-4 py-3">Now Playing</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{r.stream?.title ?? "Untitled"}</div>
                      <div className="text-xs text-white/40">{r.stream?.room_name ?? r.stream_id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === "active"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {r.status === "active" ? <Play className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      <span className="inline-flex items-center gap-1"><Music2 className="h-3.5 w-3.5" /> {r.track_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{r.current_track_id ? r.current_track_id.slice(0, 8) : "—"}</td>
                    <td className="px-4 py-3 text-white/50">{new Date(r.started_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/play/$room"
                        params={{ room: r.stream_id }}
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                      >
                        <ExternalLink className="h-3 w-3" /> Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}