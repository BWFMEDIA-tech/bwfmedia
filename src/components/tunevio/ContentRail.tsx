import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RailSize = "sm" | "md" | "lg" | "wide";

const WIDTHS: Record<RailSize, string> = {
  sm: "w-[130px] sm:w-[150px]",
  md: "w-[150px] sm:w-[172px] lg:w-[186px]",
  lg: "w-[200px] sm:w-[230px]",
  wide: "w-[260px] sm:w-[320px]",
};

export function ContentRail({
  id,
  title,
  eyebrow,
  showAllTo,
  size = "md",
  children,
  items,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  showAllTo?: string;
  size?: RailSize;
  children?: ReactNode;
  items?: ReactNode[];
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  const nodes = items ?? [];
  if (items && nodes.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-1">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tv-cyan">{eyebrow}</p>
          ) : null}
          <h2 className="truncate text-lg font-black text-white sm:text-xl">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showAllTo ? (
            <Link
              to={showAllTo as never}
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/50 transition hover:text-white"
            >
              Show all
            </Link>
          ) : null}
          <div className="hidden gap-1 md:flex">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => nudge(-1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-tv-line text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => nudge(1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-tv-line text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="tv-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-1"
      >
        {children}
        {nodes.map((node, i) => (
          <div key={i} className={cn("shrink-0 snap-start", WIDTHS[size])}>
            {node}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Vertical stack rail (used for track lists) with the same header treatment. */
export function ListSection({
  id,
  title,
  eyebrow,
  showAllTo,
  children,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  showAllTo?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-1">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tv-magenta">{eyebrow}</p>
          ) : null}
          <h2 className="truncate text-lg font-black text-white sm:text-xl">{title}</h2>
        </div>
        {showAllTo ? (
          <Link
            to={showAllTo as never}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/50 transition hover:text-white"
          >
            Show all
          </Link>
        ) : null}
      </div>
      <div className="grid gap-2 md:grid-cols-2">{children}</div>
    </section>
  );
}
