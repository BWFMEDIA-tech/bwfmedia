import { createFileRoute, Link } from "@tanstack/react-router";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { BarChart3, Music2, Users, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyArtistDashboard } from "@/lib/stream-events.functions";

export const Route = createFileRoute("/artist-dashboard")({
  head: () => ({
    meta: [
      { title: "Artist Dashboard — BWF Network" },
      { name: "description", content: "Manage your profile, music, videos, analytics and notifications." },
    ],
  }),
  component: ArtistDashboardPage,
});

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ArtistDashboardPage() {
  const fetchDash = useServerFn(getMyArtistDashboard);
  const dash = useQuery({ queryKey: ["my-artist-dashboard"], queryFn: () => fetchDash() });
  const sub = dash.data?.subscription;
  const subLabel = sub ? `${sub.price_id} · ${sub.status}` : "No active plan";
  const earnings = `$${(((dash.data?.earnings_cents ?? 0) as number) / 100).toFixed(2)}`;
  const validStreams = dash.data?.streams?.valid ?? 0;
  return (
    <ArtistDashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-white/60">Quick overview of your artist activity.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={sub ? CheckCircle2 : Clock} label="Subscription" value={subLabel} />
        <Stat icon={DollarSign} label="Earnings (placeholder)" value={earnings} />
        <Stat icon={Music2} label="Valid streams (≥30s)" value={String(validStreams)} />
        <Stat icon={BarChart3} label="Payout ready" value={dash.data?.payout_ready ? "Yes" : "Not yet"} />
      </div>
      <p className="mt-3 text-xs text-white/40">
        Royalty payouts are not calculated yet. Stream data is being collected to power the future revenue pool engine.
      </p>
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
          <div className="text-sm font-semibold">Tips</div>
          <p className="mt-2 text-sm text-white/60">Use the sidebar to manage profile, music, videos, and analytics.</p>
        </div>
      </div>
    </ArtistDashboardShell>
  );
}