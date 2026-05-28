import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { addBannedWord, removeBannedWord, endStreamAdmin, unbanUser } from "@/lib/moderation.functions";
import { toast } from "sonner";
import { Radio, DollarSign, Users, Shield, Ban, X, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — BWF Network" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const endFn = useServerFn(endStreamAdmin);
  const addWord = useServerFn(addBannedWord);
  const removeWord = useServerFn(removeBannedWord);
  const unban = useServerFn(unbanUser);

  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [tipsTotal, setTipsTotal] = useState(0);
  const [tipCount, setTipCount] = useState(0);
  const [words, setWords] = useState<any[]>([]);
  const [bans, setBans] = useState<any[]>([]);
  const [newWord, setNewWord] = useState("");

  const isAdmin = auth.roles.includes("admin");

  useEffect(() => {
    if (!auth.loading && !isAdmin) navigate({ to: "/" });
  }, [auth.loading, isAdmin]);

  const refresh = async () => {
    const [s, t, w, b] = await Promise.all([
      supabase.from("streams").select("id, title, room_name, host_id, started_at, status").eq("status", "live").order("started_at", { ascending: false }),
      supabase.from("tips").select("amount_cents").eq("status", "paid"),
      supabase.from("chat_word_filter").select("*").order("created_at", { ascending: false }),
      supabase.from("user_bans").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setLiveStreams(s.data ?? []);
    setTipCount(t.data?.length ?? 0);
    setTipsTotal((t.data ?? []).reduce((acc: number, r: any) => acc + (r.amount_cents || 0), 0));
    setWords(w.data ?? []);
    setBans(b.data ?? []);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const onEnd = async (id: string) => {
    if (!confirm("Force-end this stream?")) return;
    try { await endFn({ data: { streamId: id } }); toast.success("Stream ended"); refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };
  const onAddWord = async () => {
    if (!newWord.trim()) return;
    try { await addWord({ data: { word: newWord.trim() } }); setNewWord(""); refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };
  const onRemoveWord = async (id: string) => {
    try { await removeWord({ data: { id } }); refresh(); } catch (e: any) { toast.error(e?.message); }
  };
  const onUnban = async (id: string) => {
    try { await unban({ data: { banId: id } }); toast.success("Unbanned"); refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  if (auth.loading) return <div className="min-h-screen bg-[#050509] text-white p-6">Loading…</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#050509] text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-white/60">Platform-wide moderation and analytics.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <Link to="/admin/live-queue" className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">Live Queue</Link>
            <Link to="/admin/bookings" className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">Bookings</Link>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Radio} label="Live now" value={String(liveStreams.length)} color="#22c55e" />
          <Stat icon={DollarSign} label="Tip revenue" value={`$${(tipsTotal / 100).toFixed(2)}`} color="#8b5cf6" />
          <Stat icon={Users} label="Tips received" value={String(tipCount)} color="#3b82f6" />
          <Stat icon={Ban} label="Active bans" value={String(bans.length)} color="#ef4444" />
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
          <h2 className="mb-3 text-sm font-bold tracking-widest">LIVE STREAMS</h2>
          {liveStreams.length === 0 ? (
            <div className="text-xs text-white/40">No streams live right now.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {liveStreams.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-semibold">{s.title}</div>
                    <div className="text-[11px] text-white/40">room: {s.room_name} • started {s.started_at ? new Date(s.started_at).toLocaleTimeString() : "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/stream/$room" params={{ room: s.room_name }} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Watch</Link>
                    <button onClick={() => onEnd(s.id)} className="rounded-md bg-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/30">End</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest">WORD FILTER</h2>
            <Shield className="h-4 w-4 text-white/40" />
          </div>
          <div className="mb-3 flex gap-2">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add blocked word…"
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
            />
            <button onClick={onAddWord} className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 px-3 text-sm font-semibold inline-flex items-center gap-1"><Plus className="h-3 w-3" />Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {words.length === 0 && <div className="text-xs text-white/40">No words blocked.</div>}
            {words.map((w) => (
              <span key={w.id} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-xs">
                {w.word}
                <button onClick={() => onRemoveWord(w.id)} className="text-white/40 hover:text-white"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
          <h2 className="mb-3 text-sm font-bold tracking-widest">BANS</h2>
          {bans.length === 0 ? (
            <div className="text-xs text-white/40">No active bans.</div>
          ) : (
            <div className="divide-y divide-white/5 text-sm">
              {bans.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-mono text-xs">{b.user_id}</div>
                    <div className="text-[11px] text-white/40">{b.reason || "no reason"} • {b.expires_at ? `expires ${new Date(b.expires_at).toLocaleDateString()}` : "permanent"}</div>
                  </div>
                  <button onClick={() => onUnban(b.id)} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Unban</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
      <Icon className="mb-2 h-4 w-4" style={{ color }} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-white/50">{label}</div>
    </div>
  );
}