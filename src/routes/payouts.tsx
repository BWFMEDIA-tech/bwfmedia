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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getPayoutOverview,
  startConnectOnboarding,
  refreshConnectAccount,
  requestPayout,
} from "@/lib/payouts.functions";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts — BWF Network" },
      {
        name: "description",
        content:
          "Cash out tips and merch commissions directly to your bank via Stripe Connect Express.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    refresh: s.refresh === "1" || s.refresh === 1 || s.refresh === true ? 1 : undefined,
  }),
  component: PayoutsPage,
});

type Overview = Awaited<ReturnType<typeof getPayoutOverview>>;

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function PayoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const { refresh } = Route.useSearch();
  const fetchOverview = useServerFn(getPayoutOverview);
  const onboard = useServerFn(startConnectOnboarding);
  const refreshAcct = useServerFn(refreshConnectAccount);
  const cashOut = useServerFn(requestPayout);

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "onboard" | "cashout" | "refresh">(null);
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

  // If we just returned from Stripe onboarding (?refresh=1), pull fresh status.
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
        returnUrl: `${origin}/payouts?refresh=1`,
        refreshUrl: `${origin}/payouts?refresh=1`,
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Sign in to manage payouts</h1>
          <Link to="/login" className="text-primary underline">Go to sign in</Link>
        </div>
      </div>
    );
  }

  const d = data!;
  const acct = d.account;
  const ready = !!acct?.payouts_enabled;
  const onboarded = !!acct?.details_submitted;
  const minPayout = d.minPayoutCents;
  const canCashOut = ready && d.balance.available_cents >= minPayout;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Creator payouts
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Get paid</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cash out tips and merch commissions to your bank. Powered by Stripe Connect Express.
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
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Available to cash out
            </div>
            <div className="text-5xl font-bold tabular-nums mt-2">
              {fmt(d.balance.available_cents)}
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                Cash out {fmt(d.balance.available_cents)}
              </button>
              {!canCashOut && (
                <p className="text-xs text-muted-foreground mt-2">
                  {!ready
                    ? "Finish payout account setup to cash out."
                    : `Minimum cash-out is ${fmt(minPayout)}.`}
                </p>
              )}
            </div>
          </div>

          {/* Connect status */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Payout account</div>
            </div>
            <StatusRow
              ok={onboarded}
              label="Details submitted"
            />
            <StatusRow
              ok={!!acct?.charges_enabled}
              label="Charges enabled"
            />
            <StatusRow
              ok={ready}
              label="Payouts enabled"
            />
            <button
              onClick={handleOnboard}
              disabled={busy === "onboard"}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              {busy === "onboard" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {acct ? (ready ? "Manage on Stripe" : "Finish setup") : "Set up payouts"}
            </button>
            {acct?.country && (
              <div className="text-xs text-muted-foreground">
                {acct.country.toUpperCase()} · {(acct.default_currency ?? "usd").toUpperCase()}
              </div>
            )}
          </div>
        </section>

        {/* History */}
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Payout history</h2>
            <span className="text-xs text-muted-foreground">{d.history.length} entries</span>
          </div>
          {d.history.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No payouts yet. Once you cash out, transfers will show here.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {d.history.map((p: any) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <StatusIcon status={p.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{fmt(p.amount_cents, p.currency)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.requested_at).toLocaleString()}
                      {p.failure_reason ? ` · ${p.failure_reason}` : ""}
                    </div>
                  </div>
                  <span className={`text-xs uppercase tracking-wider ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          Payouts are processed automatically every 10 minutes. Funds typically arrive in your bank within 1–2 business days after a transfer succeeds.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
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
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
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