import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStreamLiveEarnings } from "@/lib/live-earnings.functions";

type Float = { id: number; amount: number };

const fmt = (cents: number) =>
  `$${(Math.max(0, cents) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/** Animated counter that eases towards `value`. */
function useEased(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (value === shown) return;
    fromRef.current = shown;
    startRef.current = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setShown(p === 1 ? value : next);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return shown;
}

export function LiveEarningsTicker({
  streamId,
  compact = false,
}: {
  streamId: string;
  compact?: boolean;
}) {
  const fetchFn = useServerFn(getStreamLiveEarnings);
  const q = useQuery({
    queryKey: ["stream-live-earnings", streamId],
    queryFn: () => fetchFn({ data: { streamId } }),
    refetchInterval: 15_000,
    enabled: !!streamId,
  });

  const stream = q.data?.stream_cents ?? 0;
  const pool = q.data?.pool_cents ?? 0;
  const tips = q.data?.tip_count ?? 0;

  const sEased = useEased(stream);
  const pEased = useEased(pool);

  const [floats, setFloats] = useState<Float[]>([]);
  const [pulse, setPulse] = useState(false);
  const seenTipIds = useRef<Set<string>>(new Set());

  const pushFloat = (amount: number) => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, amount }]);
    setPulse(true);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1800);
    setTimeout(() => setPulse(false), 600);
  };

  // Realtime: new tips on this stream
  useEffect(() => {
    if (!streamId) return;
    const ch = supabase
      .channel(`tips-${streamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tips", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          const row = payload.new ?? {};
          if (seenTipIds.current.has(row.id)) return;
          seenTipIds.current.add(row.id);
          if (row.status === "paid" && row.amount_cents) pushFloat(row.amount_cents);
          q.refetch();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tips", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          const row = payload.new ?? {};
          if (row.status === "paid" && !seenTipIds.current.has(row.id)) {
            seenTipIds.current.add(row.id);
            if (row.amount_cents) pushFloat(row.amount_cents);
            q.refetch();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  // Realtime: pool growth (any new revenue entry, this month)
  useEffect(() => {
    const ch = supabase
      .channel(`pool-growth`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "revenue_pool_entries" },
        () => q.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0a2e] via-[#0d0d18] to-[#0a1a2e] ${
        compact ? "p-3" : "p-4"
      }`}
      style={{
        boxShadow: pulse
          ? "0 0 40px rgba(197,61,255,0.45), inset 0 0 30px rgba(255,0,166,0.15)"
          : "0 0 0 rgba(0,0,0,0)",
        transition: "box-shadow 400ms ease",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00E6FF]">
            <Sparkles className="h-3 w-3" /> Live earnings
          </div>
          <div
            className="mt-1 truncate text-2xl font-black text-white"
            style={{ textShadow: pulse ? "0 0 20px rgba(255,0,166,0.7)" : "none" }}
          >
            {fmt(sEased)}
          </div>
          <div className="text-[11px] text-white/50">
            This stream generated · {tips.toLocaleString()} tip{tips === 1 ? "" : "s"}
          </div>
        </div>

        <div className="hidden sm:block h-12 w-px bg-white/10" />

        <div className="min-w-0 text-right">
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C53DFF]">
            <TrendingUp className="h-3 w-3" /> Pool
          </div>
          <div className="mt-1 text-2xl font-black text-white">{fmt(pEased)}</div>
          <div className="text-[11px] text-white/50">Network pool · this month</div>
        </div>
      </div>

      {/* Floating +$X */}
      <div className="pointer-events-none absolute inset-0">
        {floats.map((f) => (
          <div
            key={f.id}
            className="absolute left-4 bottom-6 text-base font-black text-[#00E6FF]"
            style={{
              animation: "earnings-float 1.7s cubic-bezier(.2,.7,.2,1) forwards",
              textShadow: "0 0 12px rgba(0,230,255,0.8)",
            }}
          >
            +{fmt(f.amount)}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes earnings-float {
          0%   { transform: translateY(0)    scale(0.9); opacity: 0; }
          15%  { transform: translateY(-6px) scale(1.05); opacity: 1; }
          100% { transform: translateY(-60px) scale(1);   opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-none absolute -inset-px rounded-2xl"
           style={{
             background: pulse
               ? "linear-gradient(135deg, rgba(197,61,255,0.25), rgba(0,230,255,0.18))"
               : "transparent",
             transition: "background 400ms ease",
             mixBlendMode: "screen",
           }}
      />
    </div>
  );
}

export default LiveEarningsTicker;