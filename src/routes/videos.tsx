import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Upload, LogIn, LogOut, Music2, Megaphone, ExternalLink } from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import grunge from "@/assets/grunge-bg.jpg";

export const Route = createFileRoute("/videos")({
  component: VideosPage,
  head: () => ({
    meta: [
      { title: "Music Videos & Sponsored Content | BWF Media" },
      { name: "description", content: "Featured music videos and sponsored content from BWF Media artists and partners." },
    ],
  }),
});

type VideoRow = {
  id: string;
  user_id: string;
  title: string;
  artist: string | null;
  description: string | null;
  category: "music" | "sponsored";
  storage_path: string;
  external_url: string | null;
  created_at: string;
};

function publicUrl(path: string) {
  return supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
}

function VideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "music" | "sponsored">("all");
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    setVideos((data as VideoRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (v: VideoRow) => {
    if (!confirm(`Delete "${v.title}"?`)) return;
    await supabase.storage.from("videos").remove([v.storage_path]);
    await supabase.from("videos").delete().eq("id", v.id);
    setVideos((cur) => cur.filter((x) => x.id !== v.id));
  };

  const filtered = filter === "all" ? videos : videos.filter((v) => v.category === filter);

  return (
    <div
      className="min-h-screen text-bone"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.95)), url(${grunge})`,
        backgroundSize: "cover",
      }}
    >
      {/* Header */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-black/85 border-b border-blood/40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={bwfLogo} alt="BWF Media" className="w-14 h-14 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            {userId ? (
              <>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone flex items-center gap-2"
                  style={{ backgroundColor: "var(--blood)" }}
                >
                  <Upload size={14} /> Upload
                </button>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-3 py-2 font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone/70 hover:text-bone flex items-center gap-2"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone flex items-center gap-2"
                style={{ backgroundColor: "var(--blood)" }}
              >
                <LogIn size={14} /> Admin Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-12">
        <p className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase mb-4" style={{ color: "var(--blood)" }}>
          ▶ BWF Vault
        </p>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase leading-[0.9]">
          Music Videos<br />
          <span style={{ color: "var(--blood)" }}>& Sponsored Drops</span>
        </h1>
        <p className="mt-6 max-w-2xl text-bone/70 text-lg">
          A curated reel of artist visuals and brand-sponsored content produced by BWF Media.
        </p>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex gap-2 mb-8">
        {(["all", "music", "sponsored"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-5 py-2 font-cond font-bold tracking-[0.25em] text-[11px] uppercase border ${
              filter === k ? "text-bone border-blood bg-blood/20" : "text-bone/60 border-bone/20 hover:text-bone"
            }`}
            style={filter === k ? { borderColor: "var(--blood)" } : undefined}
          >
            {k === "all" ? "All" : k === "music" ? "Music Videos" : "Sponsored"}
          </button>
        ))}
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 pb-24">
        {loading ? (
          <p className="text-bone/50">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="border border-bone/15 p-12 text-center">
            <p className="text-bone/60 font-cond uppercase tracking-[0.2em]">No videos yet</p>
            {userId && <p className="text-bone/40 mt-2 text-sm">Click Upload to add your first one.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v) => (
              <article key={v.id} className="group border border-bone/15 bg-black/40 hover:border-blood/60 transition-colors">
                <div className="relative aspect-video bg-black">
                  <video
                    src={publicUrl(v.storage_path)}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                  <span
                    className="absolute top-3 left-3 px-2 py-1 font-cond font-bold tracking-[0.2em] text-[9px] uppercase text-bone flex items-center gap-1"
                    style={{ backgroundColor: v.category === "sponsored" ? "#0a7" : "var(--blood)" }}
                  >
                    {v.category === "sponsored" ? <Megaphone size={10} /> : <Music2 size={10} />}
                    {v.category}
                  </span>
                </div>
                <div className="p-5">
                  <Link
                    to="/videos/$id"
                    params={{ id: v.id }}
                    className="font-display text-2xl uppercase leading-tight hover:text-blood transition-colors"
                    style={{ display: "block" }}
                  >
                    {v.title}
                  </Link>
                  {v.artist && <p className="text-bone/70 text-sm mt-1">{v.artist}</p>}
                  {v.description && <p className="text-bone/50 text-sm mt-2 line-clamp-2">{v.description}</p>}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <Link
                      to="/videos/$id"
                      params={{ id: v.id }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blood/20 border border-blood/40 text-bone text-[10px] font-cond font-bold tracking-[0.25em] uppercase hover:bg-blood transition-colors"
                    >
                      View Details
                    </Link>
                    {v.external_url && (
                      <a
                        href={v.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-bone/20 text-bone/70 text-[10px] font-cond font-bold tracking-[0.25em] uppercase hover:text-bone hover:border-bone/40 transition-colors"
                      >
                        <ExternalLink size={11} /> Link
                      </a>
                    )}
                    {userId === v.user_id && (
                      <button
                        onClick={() => handleDelete(v)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border text-[10px] font-cond font-bold tracking-[0.25em] uppercase hover:bg-blood hover:text-bone transition-colors"
                        style={{ borderColor: "var(--blood)", color: "var(--blood)" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showUpload && userId && (
        <UploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

/* ---------- Auth Modal ---------- */
function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/videos` } });
    const { error } = await fn;
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onClose();
  };

  return (
    <Modal onClose={onClose} title={mode === "signin" ? "Admin Sign In" : "Create Admin Account"}>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none"
        />
        <input
          type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 chars)"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none"
        />
        {err && <p className="text-blood text-sm">{err}</p>}
        <button
          disabled={busy}
          className="w-full py-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone disabled:opacity-50"
          style={{ backgroundColor: "var(--blood)" }}
        >
          {busy ? "…" : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
        <button
          type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-bone/60 text-sm hover:text-bone"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </Modal>
  );
}

/* ---------- Upload Modal ---------- */
function UploadModal({ userId, onClose, onUploaded }: { userId: string; onClose: () => void; onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"music" | "sponsored">("music");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr("Pick a video file"); return; }
    setBusy(true); setErr(null);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("videos").upload(path, file, { contentType: file.type });
    if (up.error) { setErr(up.error.message); setBusy(false); return; }
    const ins = await supabase.from("videos").insert({
      user_id: userId, title, artist: artist || null, description: description || null,
      category, storage_path: path,
    });
    setBusy(false);
    if (ins.error) { setErr(ins.error.message); return; }
    onUploaded();
  };

  return (
    <Modal onClose={onClose} title="Upload Video">
      <form onSubmit={submit} className="space-y-4">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none" />
        <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist / Sponsor"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3}
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none" />
        <div className="flex gap-2">
          {(["music", "sponsored"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={`flex-1 py-2 font-cond font-bold tracking-[0.25em] text-[11px] uppercase border ${
                category === c ? "text-bone bg-blood/30" : "text-bone/60 border-bone/20"
              }`}
              style={category === c ? { borderColor: "var(--blood)" } : undefined}>
              {c === "music" ? "Music Video" : "Sponsored"}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="video/*" required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-bone/70 text-sm file:mr-3 file:py-2 file:px-4 file:border-0 file:bg-blood file:text-bone file:font-cond file:uppercase file:tracking-widest file:text-[10px]" />
        {err && <p className="text-blood text-sm">{err}</p>}
        <button disabled={busy} className="w-full py-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone disabled:opacity-50"
          style={{ backgroundColor: "var(--blood)" }}>
          {busy ? "Uploading…" : "Publish"}
        </button>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-black border border-blood/40 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl uppercase mb-5 text-bone">{title}</h2>
        {children}
      </div>
    </div>
  );
}