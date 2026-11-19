import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";

const OUTPUT = 1024;
const MIN_SIZE = 400;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
// Pages people must still reach while their photo is missing.
const ALLOWED = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password", "/admin", "/contact", "/help", "/privacy", "/terms", "/email"];

export function isPhotoGateExempt(pathname: string) {
  return ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "."));
}

/** Blocks signed-in, non-admin accounts without a profile photo until they upload one. Guests are never blocked. */
export function ProfilePhotoGate() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [userId, setUserId] = useState<string | null>(null);
  const [needsPhoto, setNeedsPhoto] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check(uid: string | null) {
      setUserId(uid);
      if (!uid) { setNeedsPhoto(false); return; }
      const [{ data: profile }, { data: isAdmin }] = await Promise.all([
        supabase.from("profiles").select("avatar_url").eq("id", uid).maybeSingle(),
        supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
      ]);
      if (cancelled) return;
      setNeedsPhoto(!isAdmin && !(profile?.avatar_url ?? "").trim());
    }
    void supabase.auth.getUser().then(({ data }) => check(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void check(session?.user?.id ?? null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  if (!userId || !needsPhoto || isPhotoGateExempt(pathname)) return null;
  return <PhotoCompletion userId={userId} onDone={() => setNeedsPhoto(false)} />;
}

function PhotoCompletion({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  function draw(target: HTMLCanvasElement, size: number) {
    const ctx = target.getContext("2d"); if (!ctx || !img) return;
    target.width = size; target.height = size;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size);
    // Base scale fits the whole photo in the square (nothing cut off), zoom lets people fill it.
    const base = Math.min(size / img.width, size / img.height) * zoom;
    const w = img.width * base, h = img.height * base;
    const k = size / 280;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (size - w) / 2 + offset.x * k, (size - h) / 2 + offset.y * k, w, h);
  }
  useEffect(() => { if (canvasRef.current) draw(canvasRef.current, 560); });

  function pick(file?: File) {
    if (!file) return;
    if (!TYPES.includes(file.type)) { toast.error("Please choose a JPG, PNG or WebP picture."); return; }
    if (file.size > MAX_BYTES) { toast.error("Picture must be 5 MB or smaller."); return; }
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      if (el.width < MIN_SIZE || el.height < MIN_SIZE) { toast.error(`Picture must be at least ${MIN_SIZE} × ${MIN_SIZE} pixels.`); URL.revokeObjectURL(url); return; }
      setImg(el); setZoom(1); setOffset({ x: 0, y: 0 });
    };
    el.onerror = () => toast.error("That picture couldn't be opened.");
    el.src = url;
  }

  async function save() {
    if (!img) return;
    setSaving(true);
    try {
      const out = document.createElement("canvas");
      draw(out, OUTPUT);
      const blob: Blob | null = await new Promise((r) => out.toBlob(r, "image/webp", 0.9));
      if (!blob) throw new Error("Couldn't prepare the picture.");
      const isWebp = blob.type === "image/webp";
      const path = `${userId}/avatar-${crypto.randomUUID()}.${isWebp ? "webp" : "png"}`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: blob.type });
      if (error) throw error;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
      const { error: upErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (upErr) throw upErr;
      toast.success("Profile picture saved. Welcome to Tunevio!");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="photo-gate-title" className="fixed inset-0 z-[200] overflow-y-auto bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-5 py-10 text-center">
        <h1 id="photo-gate-title" className="text-2xl font-black tracking-tight text-white">LET THE WORLD SEE WHO YOU ARE.</h1>
        <p className="mt-2 text-sm text-zinc-300">Upload your profile picture to complete your Tunevio account. Whether you're an artist, listener, DJ, or host, your profile picture helps the community recognize you.</p>

        <div className="mt-6 w-[280px] max-w-full">
          {img ? (
            <canvas ref={canvasRef} className="aspect-square w-full touch-none cursor-grab rounded-full border-2 border-cyan-400/70 shadow-[0_0_30px_rgba(0,200,255,0.35)]"
              onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; }}
              onPointerMove={(e) => { if (drag.current) setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
              onPointerUp={() => { drag.current = null; }} aria-label="Drag to reposition your picture" />
          ) : (
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-cyan-400/50 bg-zinc-900 text-sm text-zinc-300 hover:border-cyan-300">
              Tap to choose or take a photo
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
        </div>

        {img && (
          <div className="mt-4 w-full max-w-[280px]">
            <p className="mb-2 text-xs text-zinc-400">Drag to reposition · slide to zoom</p>
            <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(v[0] ?? 1)} aria-label="Zoom" />
            <div className="mt-5 flex gap-2">
              <label className="flex-1 cursor-pointer rounded-full border border-zinc-600 px-4 py-2.5 text-sm text-zinc-200 hover:border-zinc-400">
                Change
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
              <button type="button" disabled={saving} onClick={save} className="flex-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {saving ? "Saving…" : "Save picture"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-zinc-500">Square 1:1 · recommended 1024 × 1024 · minimum 400 × 400 · JPG, PNG or WebP · up to 5 MB</p>

        <section className="mt-8 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-left">
          <h2 className="text-sm font-bold tracking-wide text-white">CREATE YOUR TUNEVIO PROFILE PICTURE</h2>
          <p className="mt-1 text-sm text-zinc-400">Want to customize your profile picture? Use Phonto to add your artist name, personal branding, or text to your photograph before uploading it to Tunevio. It's optional.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-300">
            <li><a href="https://phonto.app/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Download Phonto</a> (free, iPhone and Android).</li>
            <li>Open your photo, add text, then save it as a square picture.</li>
            <li>Come back here and upload the finished picture.</li>
          </ol>
          <p className="mt-3 text-xs text-zinc-500">Phonto is a separate app and isn't connected to Tunevio.</p>
        </section>

        <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.assign("/login"); }} className="mt-6 text-xs text-zinc-500 underline">Sign out</button>
      </div>
    </div>
  );
}
