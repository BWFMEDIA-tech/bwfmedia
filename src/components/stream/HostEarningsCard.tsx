import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { getRoomHostEstimate } from "@/lib/host-tiers.functions";

const fmt = (c: number) => `$${(Math.max(0, c) / 100).toFixed(2)}`;

/** Host-only: live host rate, eligible pool and estimated earnings for this room. */
export function HostEarningsCard({ streamId }: { streamId: string }) {
  const fn = useServerFn(getRoomHostEstimate);
  const q = useQuery({
    queryKey: ["room-host-estimate", streamId],
    queryFn: () => fn({ data: { streamId } }),
    refetchInterval: 15_000,
    enabled: !!streamId,
  });
  const d = q.data;
  if (!d) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <Crown className="h-3 w-3" /> Your host rate: {Number(d.percentage)}%
        </div>
        <Link to="/host-earnings" className="text-xs text-muted-foreground underline">View earnings</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground">Eligible pool</div>
          <div className="text-xl font-black tabular-nums">{fmt(d.eligible_pool_cents)}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">{d.final ? "You earned" : "Estimated earnings"}</div>
          <div className="text-xl font-black tabular-nums text-primary">{fmt(d.host_amount_cents)}</div>
        </div>
      </div>
      {d.status === "frozen" && <p className="mt-2 text-xs text-destructive">Your host earnings are on hold. Contact Tunevio support.</p>}
    </div>
  );
}

export default HostEarningsCard;
