import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type LiveRow = { room_name: string; title: string | null };

/**
 * Instagram/TikTok-style live strip on an artist profile.
 * Shows a LIVE pill + watch link while the artist is broadcasting,
 * and a Go Live shortcut for the profile owner when they are not.
 */
export function ProfileLiveBar({ artistId, isOwner }: { artistId: string; isOwner: boolean }) {
  const [live, setLive] = useState<LiveRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("streams")
        .select("room_name, title")
        .eq("host_id", artistId)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setLive((data as LiveRow | null) ?? null);
    };
    void load();
    const id = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [artistId]);

  if (live) {
    return (
      <Link
        to="/stream/$room"
        params={{ room: live.room_name }}
        className="flex items-center gap-3 rounded-2xl border border-[#FF00A6]/40 bg-[#FF00A6]/10 px-4 py-3 transition hover:bg-[#FF00A6]/20"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF00A6] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-white/85">{live.title || "Live now"}</span>
        <span className="text-xs font-semibold text-[#00E6FF]">Watch</span>
      </Link>
    );
  }

  if (!isOwner) return null;

  return (
    <Link
      to="/go-live"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.07]"
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-xl"
        style={{ background: "linear-gradient(135deg, rgba(255,0,166,0.3), rgba(197,61,255,0.25))" }}
      >
        <Radio className="h-4 w-4 text-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">Go Live</span>
        <span className="block text-xs text-white/55">Start a live stream on your profile.</span>
      </span>
      <span className="text-xs font-semibold text-[#00E6FF]">Start</span>
    </Link>
  );
}
