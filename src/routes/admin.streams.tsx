import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { endStreamAdmin } from "@/lib/moderation.functions";
import { toast } from "sonner";
import { Radio, Square, ArrowLeft, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/streams")({
  head: () => ({
    meta: [
      { title: "Network Streams — Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NetworkStreamsPage,
});

type StreamRow = {
  id: string;
  title: string;
  room_name: string;
  status: string;
  host_id: string;
  mode: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

function NetworkStreamsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const endFn = useServerFn(endStreamAdmin);
  const isAdmin = auth.roles.includes("admin");

  const [tab, setTab] = useState<"live" | "ended" | "all">("live");
  const [rows, setRows] = useState<StreamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.loading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("streams").select("*").order("created_at", { ascending: false }).limit(200);
    if (tab === "live") q = q.eq("status", "live");
    if (tab === "ended") q = q.eq("status", "ended");
    const { data } = await q;
    setRows((data as StreamRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, tab]);

  const handleEnd = async (id: string) => {
    if (!confirm("Terminate this stream now?")) return;
    try {
      await endFn({ data: { streamId: id } });
      toast.success("Stream ended");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to end stream");
    }
  };

  if (auth.loading || !isAdmin) return null;

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Control Center
        </Link>
        <h1 className="mt-4 text-3xl font-bold flex items-center gap-3">
          <Radio className="h-7 w-7 text-violet-400" /> Network Streams
        </h1>
        <p className="mt-1 text-white/55">Manage every live and archived broadcast across BWFNetwork.</p>

        <div className="mt-6 flex gap-2">
          {(["live", "ended", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === t ? "bg-violet-500 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">No streams found.</td></tr>
              ) : rows.map((s) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-white/40">{s.room_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      s.status === "live" ? "bg-red-500/20 text-red-300"
                      : s.status === "ended" ? "bg-white/10 text-white/60"
                      : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{s.mode}</td>
                  <td className="px-4 py-3 text-white/60">
                    {s.started_at ? new Date(s.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <a
                      href={`/stream/${s.room_name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                    {s.status === "live" && (
                      <button
                        onClick={() => handleEnd(s.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/30"
                      >
                        <Square className="h-3 w-3" /> End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}