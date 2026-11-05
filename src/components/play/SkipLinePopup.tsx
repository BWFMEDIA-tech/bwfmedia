import { useEffect, useRef, useState } from "react";
import { Zap, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImg } from "@/components/ui/signed-img";
import tunevioLogo from "@/assets/tunevio-logo.png.asset.json";
import type { PlayTrack } from "@/lib/usePlayQueue";

/** Announces an artist who paid to skip the line: shown to everyone in the
 *  Arena the moment a newly boosted track lands in the queue. Tracks already
 *  boosted when the page opens are not announced. */
export function SkipLinePopup({ queued }: { queued: PlayTrack[] }) {
  const seen = useRef<Set<string> | null>(null);
  const [shown, setShown] = useState<{ track: PlayTrack; avatar: string | null } | null>(null);

  useEffect(() => {
    const boosted = queued.filter((t) => t.boosted);
    if (seen.current === null) { seen.current = new Set(boosted.map((t) => t.id)); return; }
    const fresh = boosted.find((t) => !seen.current!.has(t.id));
    boosted.forEach((t) => seen.current!.add(t.id));
    if (!fresh) return;
    let cancelled = false;
    (async () => {
      let avatar: string | null = null;
      if (fresh.artist_user_id) {
        const { data } = await supabase.from("public_profiles").select("avatar_url").eq("id", fresh.artist_user_id).maybeSingle();
        avatar = (data as { avatar_url?: string | null } | null)?.avatar_url ?? null;
      }
      if (!cancelled) setShown({ track: fresh, avatar });
    })();
    return () => { cancelled = true; };
  }, [queued]);

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setShown(null), 8000);
    return () => window.clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  const { track, avatar } = shown;
  return (
    <div className="fixed inset-x-0 top-20 z-[100] flex justify-center px-4 animate-in fade-in slide-in-from-top-4" role="status" aria-live="polite">
      <div className="relative flex w-full max-w-sm items-center gap-4 rounded-2xl border border-cyan-400/50 bg-black/90 p-4 shadow-[0_0_30px_rgba(0,230,255,0.35)]">
        <button onClick={() => setShown(null)} aria-label="Close" className="absolute right-2 top-2 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <SignedImg
          src={avatar || (tunevioLogo as { url: string }).url}
          alt={track.artist_name ?? "Artist"}
          className="h-16 w-16 shrink-0 rounded-full border-2 border-cyan-400 object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-cyan-300">
            <Zap className="h-3 w-3" /> SKIPPED THE LINE
          </div>
          <div className="truncate text-base font-bold text-white">{track.artist_name}</div>
          <div className="truncate text-xs text-white/60">“{track.title}” is up next</div>
        </div>
      </div>
    </div>
  );
}
