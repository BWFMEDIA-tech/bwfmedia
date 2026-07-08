import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  Clock,
  XCircle,
  ExternalLink,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getPayoutOverview,
  startConnectOnboarding,
  refreshConnectAccount,
  requestPayout,
  setAutoPayout,
} from "@/lib/payouts.functions";

export const Route = createFileRoute("/settings/payouts")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    refresh: s.refresh === "1" || s.refresh === 1 || s.refresh === true ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payouts — Artist Settings — BWF Network" },
      {
        name: "description",
        content:
          "Connect your bank, view payout status, withdraw earnings, and manage auto payouts.",
      },
    ],
  }),
  component: SettingsPayoutsPage,
});

type Overview = Awaited<ReturnType<typeof getPayoutOverview>>;

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function SettingsPayoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const { refresh } = Route.useSearch();
  const fetchOverview = useServerFn(getPayoutOverview);
  const onboard = useServerFn(startConnectOnboarding);
  const refreshAcct = useServerFn(refreshConnectAccount);
  const cashOut = useServerFn(requestPayout);
  const saveAuto = useServerFn(setAutoPayout);

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "onboard" | "cashout" | "refresh" | "auto">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      setData(await fetchOverview());
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || !refresh) return;
    (async () => {
      setBusy("refresh");
      const r = await refreshAcct();
      if ("error" in r) setError(r.error);
      else setNotice("Account status updated.");
      await load();
      setBusy(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refresh]);

  const handleOnboard = async () => {
    setBusy("onboard");
    setError(null);
    const origin = window.location.origin;
    const res = await onboard({
      data: {
        returnUrl: `${origin}/settings/payouts?refresh=1`,
        refreshUrl: `${origin}/settings/payouts?refresh=1`,
      },
    });
    setBusy(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    window.location.href = res.url;
  };

  const handleCashOut = async () => {
    setBusy("cashout");
    setError(null);
    const res = await cashOut();
    setBusy(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setNotice(`Queued payout of ${fmt(res.amount_cents)}. Processing within 10 minutes.`);
    await load();
  };

  const handleToggleAuto = async (enabled: boolean) => {
    setBusy("auto");
    setError(null);
    const res = await saveAuto({
      data: {
        enabled,
        minimumPayoutCents: data?.account?.minimum_payout_cents ?? data?.minPayoutCents ?? 2500,
      },
    });
    setBusy(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setNotice(enabled ? "Auto payouts enabled." : "Auto payouts disabled.");
    await load();
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center space-y-3 py-12">
        <h1 className="text-2xl font-bold">Sign in to manage payouts</h1>
        <Link to="/login" className="text-red-500 underline">Go to sign in</Link>
      </div>
    );
  }

  const d = data!;
  const acct = d.account as any;
  const ready = !!acct?.payouts_enabled;
  const onboarded = !!acct?.details_submitted;
  const minPayout = d.minPayoutCents;
  const canCashOut = ready && d.balance.available_cents >= minPayout;
  const autoEnabled = !!acct?.auto_payout_enabled;

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
          <Wallet className="h-3.5 w-3.5" /> Artist payouts
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">Get paid</h1>
        <p className="text-white/60 mt-1 text-sm">
          Cash out tips, merch, and royalties straight to your bank. Powered by Stripe Connect Express.
        </p>
      </header>

      {(error || notice) && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      {/* Balance + Cashout */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            Available to cash out
          </div>
          <div className="text-5xl font-bold tabular-nums mt-2">
            {fmt(d.balance.available_cents)}
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Tips" value={fmt(d.balance.tips_cents)} />
            <Stat label="Merch" value={fmt(d.balance.merch_cents)} />
            <Stat label="In transit" value={fmt(d.balance.pending_cents)} />
            <Stat label="Paid out" value={fmt(d.balance.paid_out_cents)} />
          </div>
          <div className="mt-5">
            <button
              disabled={!canCashOut || busy === "cashout"}
              onClick={handleCashOut}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === "cashout" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Withdraw {fmt(d.balance.available_cents)}
            </button>
            {!canCashOut && (
              <p className="text-xs text-white/50 mt-2">
                {!ready
                  ? "Connect your bank to enable withdrawals."
                  : `Minimum withdrawal is ${fmt(minPayout)}.`}
              </p>
            )}
          </div>
        </div>

        {/* Connect status */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-white/60" />
            <div className="text-sm font-semibold">Bank account</div>
          </div>
          <StatusRow ok={onboarded} label="Details submitted" />
          <StatusRow ok={!!acct?.charges_enabled} label="Charges enabled" />
          <StatusRow ok={ready} label="Payouts enabled" />
          <button
            onClick={handleOnboard}
            disabled={busy === "onboard"}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {busy === "onboard" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {acct ? (ready ? "Manage on Stripe" : "Finish setup") : "Connect bank account"}
          </button>
          {acct?.country && (
            <div className="text-[11px] text-white/40">
              {acct.country.toUpperCase()} · {(acct.default_currency ?? "usd").toUpperCase()}
            </div>
          )}
        </div>
      </section>

      {/* Auto payout toggle */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-fuchsia-500/10 p-2 text-fuchsia-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Auto payouts</div>
            <p className="text-xs text-white/50 mt-0.5">
              Automatically withdraw your balance every month when it's above the minimum (
              {fmt(acct?.minimum_payout_cents ?? minPayout)}).
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={autoEnabled}
          disabled={!ready || busy === "auto"}
          onClick={() => handleToggleAuto(!autoEnabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50 ${
            autoEnabled ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              autoEnabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </section>

      {/* History */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-semibold">Payout history</h2>
          <span className="text-xs text-white/40">{d.history.length} entries</span>
        </div>
        {d.history.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-white/50">
            No payouts yet. Once you withdraw, transfers will show here.
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {d.history.map((p: any) => (
              <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                <StatusIcon status={p.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{fmt(p.amount_cents, p.currency)}</div>
                  <div className="text-xs text-white/40">
                    {new Date(p.requested_at).toLocaleString()}
                    {p.failure_reason ? ` · ${p.failure_reason}` : ""}
                  </div>
                </div>
                <span className={`text-[11px] uppercase tracking-wider ${statusColor(p.status)}`}>
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-white/40">
        Payouts process every 10 minutes. Funds typically arrive in your bank within 1–2 business days after the transfer succeeds.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-400" />
      )}
      <span className={ok ? "" : "text-white/60"}>{label}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "paid")
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === "failed" || status === "canceled")
    return <XCircle className="h-5 w-5 text-red-400" />;
  return <Clock className="h-5 w-5 text-amber-400" />;
}

function statusColor(status: string) {
  if (status === "paid") return "text-emerald-400";
  if (status === "failed" || status === "canceled") return "text-red-400";
  return "text-amber-400";
}