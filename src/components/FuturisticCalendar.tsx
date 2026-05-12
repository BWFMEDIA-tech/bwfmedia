import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FuturisticCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  accent?: string; // hex color for the futuristic accent
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function FuturisticCalendar({
  selected,
  onSelect,
  disabled,
  className,
  accent = "#D4A24C",
}: FuturisticCalendarProps) {
  const [view, setView] = useState<Date>(() => startOfMonth(selected ?? new Date()));
  const today = new Date();

  const days = useMemo(() => {
    const first = startOfMonth(view);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const goPrev = () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1));
  const goNext = () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1));

  return (
    <div
      className={cn("relative w-full max-w-[360px] mx-auto select-none", className)}
      style={{
        // futuristic frame
        background:
          "linear-gradient(180deg, rgba(10,10,12,0.85) 0%, rgba(18,18,22,0.85) 100%)",
        border: `1px solid ${accent}55`,
        boxShadow: `0 0 0 1px ${accent}11 inset, 0 20px 60px -20px ${accent}55, 0 0 40px -10px ${accent}33`,
        padding: "16px",
        position: "relative",
      }}
    >
      {/* corner brackets */}
      <span aria-hidden className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: accent }} />
      <span aria-hidden className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: accent }} />
      <span aria-hidden className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: accent }} />
      <span aria-hidden className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: accent }} />

      {/* scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, #fff 2px, #fff 3px)",
        }}
      />

      {/* header */}
      <div className="relative flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goPrev}
          className="w-7 h-7 grid place-items-center transition hover:scale-110"
          style={{ border: `1px solid ${accent}55`, color: accent }}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div
            className="text-[10px] tracking-[0.4em] uppercase"
            style={{ color: `${accent}`, opacity: 0.7 }}
          >
            // Temporal Index
          </div>
          <div className="font-cond tracking-[0.25em] uppercase text-bone text-sm mt-1">
            {monthLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={goNext}
          className="w-7 h-7 grid place-items-center transition hover:scale-110"
          style={{ border: `1px solid ${accent}55`, color: accent }}
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* weekday row */}
      <div className="relative grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] tracking-[0.3em] uppercase"
            style={{ color: `${accent}99` }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="relative grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const isToday = isSameDay(d, today);
          const isSelected = selected && isSameDay(d, selected);
          const isDisabled = disabled?.(d) ?? false;

          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect?.(d)}
              className={cn(
                "aspect-square relative font-mono text-xs transition-all",
                "flex items-center justify-center",
                isDisabled
                  ? "opacity-20 cursor-not-allowed"
                  : "hover:scale-[1.08] cursor-pointer"
              )}
              style={{
                color: isSelected ? "#000" : isToday ? accent : "rgba(245,235,210,0.85)",
                background: isSelected
                  ? accent
                  : isToday
                  ? `${accent}1A`
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  isSelected ? accent : isToday ? `${accent}88` : `${accent}22`
                }`,
                boxShadow: isSelected
                  ? `0 0 12px ${accent}AA, inset 0 0 10px ${accent}66`
                  : "none",
              }}
            >
              {d.getDate()}
              {isToday && !isSelected && (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* footer status */}
      <div className="relative mt-4 flex items-center justify-between text-[9px] tracking-[0.3em] uppercase" style={{ color: `${accent}99` }}>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
          Sync · Live
        </span>
        <span>
          {selected
            ? `Locked · ${selected.toISOString().slice(0, 10)}`
            : "Awaiting Input"}
        </span>
      </div>
    </div>
  );
}

export default FuturisticCalendar;