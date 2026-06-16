import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Zap, X, Sparkles, ShoppingCart, History, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { getBoostWallet, createBoostPackCheckout } from "@/lib/boost-economy.functions";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Boost Credits — BWF Network" },
      { name: "description", content: "Buy boost credits to push your favorite tracks up the Play Arena leaderboard." },
    ],
  }),
  component: CreditsPage,
});

type Pack = { id: string; name: string; credits: number; price_cents: number; currency: string };
type Ledger = {
  id: string;
  delta: number;
  reason: string;
  reference_id: string | null;
  balance_after: number;
  metadata: Record<string, any>;
  created_at: string;
};
type Wallet = { balance: number; updatedAt: string | null; ledger: Ledger[]; packs: Pack[] };

function fmtMoney(cents: number, currency: string = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}
const REASON_LABELS: Record<string, string> = {
  purchase: "Pack purchase",
  spend_boost: "Boosted track",
  spend_priority_review: "Priority review",
  admin_grant: "Admin grant",
  refund: "Refund",
  signup_bonus: "Signup bonus",
};

function CreditsPage() {
  const { user, loading: authLoading } = useAuth();
  const fetchWallet = useServerFn(getBoostWallet);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPack, setCheckoutPack] = useState<Pack | null>(null);

  const refresh = useCallback(async () => {
    try {
      const w = await fetchWallet();
      setWallet(w as Wallet);
    } finally {
      setLoading(false);
    }
  }, [fetchWallet]);

  useEffect(() => {
    if (!authLoading && user) refresh();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, refresh]);

  // Refresh when returning from successful checkout
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") === "success") {
      // Webhook is async — poll for ~10s
      let n = 0;
      const t = setInterval(() => {
        n += 1;
        refresh();
        if (n >= 5) clearInterval(t);
      }, 2000);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
      return () => clearInterval(t);
    }
  }, [refresh]);

  if (authLoading || loading) {
    return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-white/50" /></div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-2xl font-black">Sign in to view your boost credits</h1>
        <Link to="/login" className="mt-4 inline-block rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold hover:bg-red-500">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Boost Credits</h1>
          <p className="mt-1 text-sm text-white/60">Buy credits, then spend them to boost tracks in the Play Arena.</p>
        </div>
      </header>

      {/* Balance card */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-600/20 via-pink-500/10 to-cyan-500/10 p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500">
            <Zap className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-white/60">Available balance</div>
            <div className="text-4xl font-black tabular-nums">{wallet?.balance ?? 0}</div>
            <div className="text-xs text-white/40">1 credit = 1 weight unit on a boost</div>
          </div>
        </div>
      </section>

      {/* Packs */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/70">
          <ShoppingCart className="h-4 w-4" /> Buy credits
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(wallet?.packs ?? []).map((p) => {
            const isPro = p.id === "boost_pack_pro";
            return (
              <button
                key={p.id}
                onClick={() => setCheckoutPack(p)}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition hover:border-white/30 ${
                  isPro ? "border-fuchsia-500/40 bg-fuchsia-500/5" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {isPro && (
                  <span className="absolute right-3 top-3 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-bold uppercase">
                    Best value
                  </span>
                )}
                <div className="flex items-center gap-2 text-white/80">
                  <Sparkles className="h-4 w-4" /> <span className="text-sm font-semibold">{p.name}</span>
                </div>
                <div className="mt-3 text-4xl font-black tabular-nums">{p.credits}</div>
                <div className="text-xs text-white/50">credits</div>
                <div className="mt-4 text-lg font-bold">{fmtMoney(p.price_cents, p.currency)}</div>
                <div className="mt-3 text-xs text-white/40">
                  {(p.price_cents / p.credits / 100).toFixed(2)} USD / credit
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Ledger */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/70">
          <History className="h-4 w-4" /> Recent activity
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {(wallet?.ledger ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-white/50">No activity yet. Buy a pack to get started.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(wallet?.ledger ?? []).map((row) => {
                  const positive = row.delta > 0;
                  return (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="px-4 py-3 text-white/70">{fmtDate(row.created_at)}</td>
                      <td className="px-4 py-3">{REASON_LABELS[row.reason] ?? row.reason}</td>
                      <td className={`px-4 py-3 text-right font-mono ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                        <span className="inline-flex items-center gap-1">
                          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {positive ? "+" : ""}{row.delta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{row.balance_after}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {checkoutPack && (
        <CheckoutModal pack={checkoutPack} onClose={() => { setCheckoutPack(null); refresh(); }} />
      )}
    </div>
  );
}

function CheckoutModal({ pack, onClose }: { pack: Pack; onClose: () => void }) {
  const checkoutFn = useServerFn(createBoostPackCheckout);
  const fetchClientSecret = async (): Promise<string> => {
    const returnUrl = `${window.location.origin}/credits?checkout=success`;
    const res = await checkoutFn({
      data: { packId: pack.id, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error("Stripe did not return a client secret");
    return res.clientSecret;
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0d18]">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1.5 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
        <div className="p-3">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}