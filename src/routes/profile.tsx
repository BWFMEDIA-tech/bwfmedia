import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Save, Loader2, MessageSquare, DollarSign, Video, Hand, Mic, Film, Camera, X } from "lucide-react";
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

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const currentPhotoUrl = previewUrl || avatarUrl;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Photo must be under 5MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  function removePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    if (!user) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      toast.error(uploadError.message);
      return null;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function save() {
    if (!user) return;
    setSaving(true);

    let finalAvatarUrl = avatarUrl;

    if (previewUrl && fileInputRef.current?.files?.[0]) {
      setUploadingPhoto(true);
      const uploaded = await uploadPhoto(fileInputRef.current.files[0]);
      setUploadingPhoto(false);
      if (uploaded) {
        finalAvatarUrl = uploaded;
        setAvatarUrl(uploaded);
        removePreview();
      }
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName.trim() || null,
        avatar_url: finalAvatarUrl.trim() || null,
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
      <div className="min-h-screen bg-black text-bone grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-blood" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-bone relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, rgba(225,29,42,0.18) 0%, transparent 60%), radial-gradient(50% 40% at 100% 100%, rgba(255,61,79,0.12) 0%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-4 md:px-6 py-10">
        <Link to="/stream-studio" className="inline-flex items-center gap-2 font-cond text-xs uppercase tracking-[0.25em] text-bone/60 hover:text-blood transition-colors mb-8">
          <ArrowLeft className="h-3 w-3" /> Back to Studio
        </Link>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blood/40 bg-blood/10 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blood animate-pulse" />
          <span className="font-cond text-[10px] uppercase tracking-[0.3em] text-blood">BWF Network</span>
        </div>

        <h1
          className="font-cond text-4xl md:text-5xl font-black uppercase tracking-tight bg-clip-text text-transparent mb-8"
          style={{ backgroundImage: "var(--gradient-blood)" }}
        >
          Your Profile.
        </h1>

        <div className="grid md:grid-cols-[260px_1fr] gap-8">
          {/* Avatar + identity */}
          <div className="space-y-4">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-md border border-blood/30 bg-black/60 backdrop-blur-md group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-blood)" }} />
              {currentPhotoUrl ? (
                <img src={currentPhotoUrl} alt={displayName} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center font-cond text-5xl font-black text-bone/70">{initials || "?"}</div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                <Camera className="h-8 w-8 text-blood" />
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 grid place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blood" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl && (
              <button
                onClick={removePreview}
                className="flex items-center gap-1 font-cond text-[10px] uppercase tracking-widest text-bone/60 hover:text-blood transition-colors"
              >
                <X className="h-3 w-3" /> Remove preview
              </button>
            )}
            <div>
              <h2 className="font-cond text-2xl font-black uppercase tracking-tight text-bone">{displayName || "Unnamed"}</h2>
              <p className="text-xs text-bone/50 mt-1 break-all">{user?.email}</p>
              {roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {roles.map((r) => (
                    <span key={r} className="rounded-full border border-blood/40 bg-blood/10 px-2 py-0.5 font-cond text-[10px] uppercase tracking-widest text-blood">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Edit form + stats */}
          <div className="space-y-8">
            <section className="rounded-md border border-blood/30 bg-black/60 backdrop-blur-md p-5">
              <h2 className="font-cond text-[11px] uppercase tracking-[0.3em] text-blood mb-3">Edit Profile</h2>
              <div className="space-y-3">
                <Field label="Username">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full bg-black/40 border border-blood/30 rounded-md px-3 py-2.5 text-sm text-bone placeholder:text-bone/30 focus:outline-none focus:border-blood transition-colors"
                  />
                </Field>
                <Field label="Bio">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Tell people who you are…"
                    className="w-full resize-none bg-black/40 border border-blood/30 rounded-md px-3 py-2.5 text-sm text-bone placeholder:text-bone/30 focus:outline-none focus:border-blood transition-colors"
                  />
                </Field>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-blood px-4 py-2.5 font-cond text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-blood-glow transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save profile
                </button>
              </div>
            </section>

            <section>
              <h2 className="font-cond text-[11px] uppercase tracking-[0.3em] text-blood mb-3">Key stats</h2>
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
      <span className="block font-cond text-[10px] uppercase tracking-[0.25em] text-bone/60 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-md border border-blood/30 bg-black/60 backdrop-blur-md p-4 hover:border-blood transition-colors">
      <Icon className="h-4 w-4 text-blood mb-2" />
      <div className="font-cond text-2xl font-black tracking-tight text-bone">{value.toLocaleString()}</div>
      <div className="font-cond text-[10px] uppercase tracking-widest text-bone/60 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-blood-glow mt-1">{sub}</div>}
    </div>
  );
}
