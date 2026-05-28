import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Loader2, MessageSquare, DollarSign, Video, Hand, Mic, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — BWF Network" },
      { name: "description", content: "Your BWF Network profile, photo, bio and activity stats." },
    ],
  }),
  component: ProfilePage,
});

type Stats = {
  messages: number;
  tipsCount: number;
  tipsTotalCents: number;
  videos: number;
  hands: number;
  queue: number;
  recordings: number;
};

function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated, roles } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const uid = user.id;
      const [profileRes, msgRes, tipsRes, vidRes, handsRes, queueRes, recRes] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url, bio").eq("id", uid).maybeSingle(),
        supabase.from("stream_messages").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("tips").select("amount_cents", { count: "exact" }).eq("user_id", uid).eq("status", "paid"),
        supabase.from("videos").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("raise_hand_requests").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("stream_queue").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("stream_recordings").select("id", { count: "exact", head: true }).eq("host_id", uid),
      ]);
      if (cancelled) return;
      const p = profileRes.data;
      setDisplayName(p?.display_name ?? user.email?.split("@")[0] ?? "");
      setAvatarUrl(p?.avatar_url ?? "");
      setBio(p?.bio ?? "");
      const tipsTotal = (tipsRes.data ?? []).reduce((s: number, t: any) => s + (t.amount_cents ?? 0), 0);
      setStats({
        messages: msgRes.count ?? 0,
        tipsCount: tipsRes.count ?? 0,
        tipsTotalCents: tipsTotal,
        videos: vidRes.count ?? 0,
        hands: handsRes.count ?? 0,
        queue: queueRes.count ?? 0,
        recordings: recRes.count ?? 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const initials = useMemo(() => {
    const src = displayName || user?.email || "";
    return src.split(/[\s@]+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }, [displayName, user?.email]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
      });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile saved");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050509] text-white grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <div className="mx-auto max-w-4xl px-4 md:px-6 py-10">
        <Link to="/stream-studio" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60 hover:text-white mb-8">
          <ArrowLeft className="h-3 w-3" /> Back to Studio
        </Link>

        <div className="grid md:grid-cols-[260px_1fr] gap-8">
          {/* Avatar + identity */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-600/30 to-blue-600/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-5xl font-black text-white/30">{initials || "?"}</div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{displayName || "Unnamed"}</h1>
              <p className="text-xs text-white/50 mt-1 break-all">{user?.email}</p>
              {roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {roles.map((r) => (
                    <span key={r} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/70">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Edit form + stats */}
          <div className="space-y-8">
            <section>
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/50 mb-3">Profile</h2>
              <div className="space-y-3">
                <Field label="Display name">
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30" />
                </Field>
                <Field label="Avatar URL">
                  <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30" />
                </Field>
                <Field label="Bio">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell people who you are…" className="w-full resize-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30" />
                </Field>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save profile
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/50 mb-3">Key stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard icon={MessageSquare} label="Chat messages" value={stats?.messages ?? 0} />
                <StatCard
                  icon={DollarSign}
                  label="Tips sent"
                  value={stats?.tipsCount ?? 0}
                  sub={stats && stats.tipsTotalCents > 0 ? `$${(stats.tipsTotalCents / 100).toFixed(2)} total` : undefined}
                />
                <StatCard icon={Video} label="Videos uploaded" value={stats?.videos ?? 0} />
                <StatCard icon={Hand} label="Hands raised" value={stats?.hands ?? 0} />
                <StatCard icon={Mic} label="Stage queues" value={stats?.queue ?? 0} />
                <StatCard icon={Film} label="Recordings hosted" value={stats?.recordings ?? 0} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <Icon className="h-4 w-4 text-white/50 mb-2" />
      <div className="text-2xl font-black tracking-tight">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-white/60 mt-1">{sub}</div>}
    </div>
  );
}