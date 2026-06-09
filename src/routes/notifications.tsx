import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — BWF Network" },
      { name: "description", content: "Live alerts, mentions, and activity across BWF Network." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) nav({ to: "/login" });
  }, [auth.loading, auth.isAuthenticated, nav]);

  useEffect(() => {
    if (!auth.user) return;
    const uid = auth.user.id;
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read_at, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled) { setItems((data ?? []) as Notif[]); setLoading(false); }
    };
    refresh();
    const ch = supabase
      .channel(`notif-feed-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [auth.user?.id]);

  const markAllRead = async () => {
    if (!auth.user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.user.id).is("read_at", null);
    toast.success("All marked read");
  };

  const open = async (n: Notif) => {
    if (!n.read_at && auth.user) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() })
        .eq("id", n.id).eq("user_id", auth.user.id);
    }
    if (n.link) nav({ to: n.link as any });
  };

  return (
    <div className="min-h-screen bg-[#050509] text-white pt-24 pb-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3"><Bell className="h-7 w-7" /> Notifications</h1>
          <button onClick={markAllRead} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>
        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-white/30 mb-3" />
            <p className="text-white/60">You're all caught up.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`w-full text-left rounded-xl border p-4 transition ${n.read_at ? "border-white/5 bg-white/[0.02]" : "border-violet-500/30 bg-violet-500/5"}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)" }}>
                      {n.type === "live_stream_started" ? <Radio className="h-4 w-4 text-white" /> : <Bell className="h-4 w-4 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-white truncate">{n.title}</p>
                        <span className="text-[10px] text-white/40 shrink-0">{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {n.body && <p className="text-sm text-white/70 mt-1 line-clamp-2">{n.body}</p>}
                      {!n.read_at && <span className="inline-block mt-2 rounded-full bg-violet-500/20 text-violet-300 px-2 py-0.5 text-[10px] font-semibold">New</span>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}