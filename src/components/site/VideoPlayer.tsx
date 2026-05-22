import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { HUDFrame, GOLD } from "@/components/site/FutureShell";
import { cn } from "@/lib/utils";

export type PlaylistVideo = {
  id: string;
  title: string;
  subtitle?: string;
};

type Props = {
  videos: PlaylistVideo[];
  initialIndex?: number;
};

export function VideoPlayer({ videos, initialIndex = 0 }: Props) {
  const [active, setActive] = useState(initialIndex);
  const current = videos[active];

  if (!current) return null;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      {/* MAIN STAGE */}
      <HUDFrame className="p-3 md:p-4">
        <div
          className="relative w-full aspect-video overflow-hidden bg-black"
          style={{ border: `1px solid ${GOLD}33` }}
        >
          <AnimatePresence mode="wait">
            <motion.iframe
              key={current.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              src={`https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0`}
              title={current.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </AnimatePresence>
        </div>
        <div className="mt-4 px-1">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
            Now Playing
          </div>
          <h3 className="mt-1 font-anton text-2xl md:text-3xl uppercase tracking-wide text-bone">
            {current.title}
          </h3>
          {current.subtitle && (
            <p className="mt-1 text-sm text-bone/60">{current.subtitle}</p>
          )}
        </div>
      </HUDFrame>

      {/* PLAYLIST */}
      <HUDFrame className="p-3 md:p-4">
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
            Playlist
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-bone/40">
            {active + 1} / {videos.length}
          </div>
        </div>
        <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
          {videos.map((v, i) => {
            const isActive = i === active;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "group flex gap-3 text-left p-2 border transition-all",
                  isActive
                    ? "bg-bone/5"
                    : "border-transparent hover:bg-bone/[0.03]"
                )}
                style={isActive ? { borderColor: `${GOLD}66` } : undefined}
              >
                <div
                  className="relative shrink-0 w-28 aspect-video overflow-hidden bg-black"
                  style={{ border: `1px solid ${GOLD}22` }}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                    alt={v.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                    <Play
                      className="w-6 h-6"
                      style={{ color: isActive ? GOLD : "#fff" }}
                      fill={isActive ? GOLD : "#fff"}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div
                    className={cn(
                      "font-anton uppercase tracking-wide text-sm leading-tight line-clamp-2",
                      isActive ? "text-bone" : "text-bone/80"
                    )}
                  >
                    {v.title}
                  </div>
                  {v.subtitle && (
                    <div className="mt-1 text-[11px] text-bone/50 line-clamp-1">
                      {v.subtitle}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </HUDFrame>
    </div>
  );
}