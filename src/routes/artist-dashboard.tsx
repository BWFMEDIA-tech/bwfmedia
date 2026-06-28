import { createFileRoute, Link } from "@tanstack/react-router";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { BarChart3, Music2, DollarSign, CheckCircle2, Clock, Wallet, TrendingUp, CalendarClock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyArtistDashboard } from "@/lib/stream-events.functions";
import { getMyRoyaltyEarnings, requestRoyaltyPayout, setAutoPayout } from "@/lib/payouts.functions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/artist-dashboard")({
  head: () => ({
    meta: [
      { title: "Artist Dashboard — BWF Network" },
      { name: "description", content: "Manage your profile, music, videos, analytics and notifications." },
    ],
  }),
  component: ArtistDashboardPage,
});

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-white/40">{sub}</div> : null}
    </div>
  );
}

const fmtUsd = (cents: number | null | undefined) =>
  `$${((Number(cents ?? 0)) / 100).toFixed(2)}`;

function ArtistDashboardPage() {
  const qc = useQueryClient();
  const fetchDash = useServerFn(getMyArtistDashboard);
  const fetchRoyalty = useServerFn(getMyRoyaltyEarnings);
  const requestPayoutFn = useServerFn(requestRoyaltyPayout);
  const setAutoPayoutFn = useServerFn(setAutoPayout);

  const dash = useQuery({ queryKey: ["my-artist-dashboard"], queryFn: () => fetchDash() });
  const royalty = useQuery({ queryKey: ["my-royalty-earnings"], queryFn: () => fetchRoyalty() });

  const sub = (dash.data as any)?.subscription;
  const subLabel = sub ? `${sub.price_id} · ${sub.status}` : "No active plan";
  const earningsObj = ((dash.data as any)?.earnings ?? {}) as Record<string, number>;
  const summary = (royalty.data?.summary as any) ?? earningsObj;
  const months = royalty.data?.months ?? [];
  const account = ((dash.data as any)?.payout_account ?? null) as
    | { auto_payout_enabled: boolean; minimum_payout_cents: number; payouts_enabled: boolean }
    | null;

  const available = Number(summary?.available_cents ?? 0);
  const pending = Number(summary?.pending_cents ?? 0);
  const paid = Number(summary?.paid_cents ?? 0);
  const estimate = Number(summary?.estimated_this_month_cents ?? 0);
  const weighted = Number(summary?.lifetime_weighted_streams ?? 0);
  const rawStreams = Number(summary?.lifetime_raw_streams ?? 0);

  const withdraw = useMutation({
    mutationFn: async () => {
      const r = (await requestPayoutFn()) as any;
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: (r: any) => {
      toast.success(`Payout of ${fmtUsd(r.amount_cents)} queued`);
      qc.invalidateQueries({ queryKey: ["my-royalty-earnings"] });
      qc.invalidateQueries({ queryKey: ["my-artist-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Payout failed"),
  });

  const toggleAuto = useMutation({
    mutationFn: async (enabled: boolean) => {
      const r = (await setAutoPayoutFn({ data: { enabled } })) as any;
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-artist-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  return (
    <ArtistDashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-white/60">Live overview of your streams, earnings, and payouts.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={sub ? CheckCircle2 : Clock} label="Subscription" value={subLabel} />
        <Stat icon={Wallet} label="Available to withdraw" value={fmtUsd(available)} sub={`Pending ${fmtUsd(pending)} · Paid ${fmtUsd(paid)}`} />
        <Stat icon={TrendingUp} label="Est. this month" value={fmtUsd(estimate)} sub="Updates as streams accrue" />
        <Stat icon={Music2} label="Weighted streams" value={weighted.toLocaleString(undefined,{maximumFractionDigits:2})} sub={`${rawStreams.toLocaleString()} valid plays`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Withdraw earnings</div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              Auto-payout
              <Switch
                checked={!!account?.auto_payout_enabled}
                disabled={!account || toggleAuto.isPending}
                onCheckedChange={(v) => toggleAuto.mutate(!!v)}
              />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold">{fmtUsd(available)}</div>
          <p className="mt-1 text-xs text-white/50">
            Min payout {fmtUsd(account?.minimum_payout_cents ?? 2500)}. Stripe Connect required.
          </p>
          <Button
            className="mt-4 w-full"
            disabled={!account?.payouts_enabled || available < (account?.minimum_payout_cents ?? 2500) || withdraw.isPending}
            onClick={() => withdraw.mutate()}
          >
            {withdraw.isPending ? "Queuing…" : "Withdraw now"}
          </Button>
          {!account?.payouts_enabled ? (
            <p className="mt-2 text-xs text-amber-300">
              <Link to="/settings/payouts" className="underline">Finish Stripe Connect onboarding</Link> to unlock payouts.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4" /> Monthly royalty history
          </div>
          <div className="mt-3 divide-y divide-white/5 text-sm">
            {months.length === 0 ? (
              <p className="py-2 text-white/50">No royalty months yet. Stream activity will populate here.</p>
            ) : (
              months.map((m: any) => (
                <div key={m.month} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{new Date(m.month).toLocaleString(undefined,{month:'short',year:'numeric'})}</div>
                    <div className="text-xs text-white/40">
                      {Number(m.weighted_streams).toLocaleString(undefined,{maximumFractionDigits:2})} weighted · {Number(m.share_pct).toFixed(2)}% share
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtUsd(m.payout_amount_cents)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{m.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <div className="text-sm font-semibold">Get started</div>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>• <Link to="/settings/profile" className="hover:text-white">Complete your profile</Link></li>
            <li>• <Link to="/settings/music-media" className="hover:text-white">Upload your first single</Link></li>
            <li>• <Link to="/settings/social-links" className="hover:text-white">Connect social links</Link></li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <div className="text-sm font-semibold">Revenue breakdown</div>
          <div className="mt-3 space-y-1 text-sm text-white/70">
            <div className="flex justify-between"><span>Approved royalties</span><span>{fmtUsd(Number(summary?.approved_cents ?? 0))}</span></div>
            <div className="flex justify-between"><span>Pending royalties</span><span>{fmtUsd(pending)}</span></div>
            <div className="flex justify-between"><span>Paid out lifetime</span><span>{fmtUsd(paid)}</span></div>
            <div className="flex justify-between"><span>Awaiting transfer</span><span>{fmtUsd(Number(summary?.requested_cents ?? 0))}</span></div>
          </div>
        </div>
      </div>
    </ArtistDashboardShell>
  );
}