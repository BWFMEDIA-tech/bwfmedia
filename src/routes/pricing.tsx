import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "@/lib/auth-context";
import { createTunevioCheckout, TUNEVIO_PLANS, type TunevioPlanId } from "@/lib/tunevio-subscriptions.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Tunevio Pricing — Streaming & Artist Plans" },
      { name: "description", content: "Premium streaming for listeners and pro tools for artists. Plans starting at $4.99/month." },
    ],
  }),
});

type Tab = "listener" | "artist";

const FEATURES: Record<TunevioPlanId, string[]> = {
  listener_premium:     ["Ad-free streaming", "Unlimited skips", "High-quality audio", "Offline listening"],
  listener_fan_premium: ["Everything in Premium", "Exclusive fan-only drops", "Early access to releases", "Direct artist messaging"],
  listener_student:     ["Ad-free streaming", "Verified student discount", "Unlimited skips", "Cancel anytime"],
  artist_starter:       ["Upload unlimited tracks", "Basic analytics", "Artist profile page", "Standard payouts"],
  artist_pro:           ["Everything in Starter", "Advanced analytics", "Featured placement boosts", "Priority support"],
  label_plan:           ["Manage multiple artists", "Label dashboard & roster tools", "Bulk uploads & scheduling", "Dedicated success manager"],
};

const HIGHLIGHT: Partial<Record<TunevioPlanId, string>> = {
  listener_fan_premium: "Most popular",
  artist_pro: "Most popular",
};

function PricingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("listener");
  const [activePlan, setActivePlan] = useState<TunevioPlanId | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<TunevioPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans = useMemo(
    () => (Object.keys(TUNEVIO_PLANS) as TunevioPlanId[]).filter((id) => TUNEVIO_PLANS[id].role === tab),
    [tab],
  );

  async function startCheckout(planId: TunevioPlanId) {
    if (!user) {
      window.location.href = `/login?next=/pricing`;
      return;
    }
    setLoadingPlan(planId);
    setError(null);
    try {
      const result = await createTunevioCheckout({
        data: {
          planId,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      setActivePlan(planId);
      setClientSecret(result.clientSecret);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start checkout");
    } finally {
      setLoadingPlan(null);
    }
  }

  function closeCheckout() {
    setClientSecret(null);
    setActivePlan(null);
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-24">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-white/60 mb-4">
            <Sparkles className="h-3 w-3" /> Tunevio Plans
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            Listen. Create. <span className="bg-gradient-to-r from-[#C53DFF] via-[#FF00A6] to-[#00E6FF] bg-clip-text text-transparent">Get paid.</span>
          </h1>
          <p className="mt-4 text-white/60 max-w-xl mx-auto">
            Premium streaming for fans. Pro tools for artists and labels. Cancel anytime.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1">
            {(["listener", "artist"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2 text-sm font-bold uppercase tracking-wider rounded-full transition ${
                  tab === t ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                {t === "listener" ? "For Listeners" : "For Artists"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((planId) => {
            const plan = TUNEVIO_PLANS[planId];
            const tag = HIGHLIGHT[planId];
            const isHighlighted = !!tag;
            return (
              <div
                key={planId}
                className={`relative rounded-2xl p-6 border bg-gradient-to-b from-white/[0.04] to-transparent ${
                  isHighlighted
                    ? "border-[#FF00A6]/60 shadow-[0_0_60px_-15px_rgba(255,0,166,0.5)]"
                    : "border-white/10"
                }`}
              >
                {tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-[#C53DFF] to-[#FF00A6] text-white">
                    {tag}
                  </div>
                )}
                <div className="text-sm uppercase tracking-widest text-white/50">{plan.label}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-5xl font-black">${(plan.priceCents / 100).toFixed(2)}</span>
                  <span className="text-white/50 text-sm">/mo</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {FEATURES[planId].map((f) => (
                    <li key={f} className="flex gap-2 text-white/80">
                      <Check className="h-4 w-4 mt-0.5 text-[#00E6FF] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => startCheckout(planId)}
                  disabled={loadingPlan === planId}
                  className={`mt-6 w-full font-bold uppercase tracking-wider ${
                    isHighlighted
                      ? "bg-gradient-to-r from-[#C53DFF] to-[#FF00A6] hover:opacity-90"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  {loadingPlan === planId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                </Button>
              </div>
            );
          })}
        </div>

        {tab === "listener" && (
          <div className="mt-12 text-center text-sm text-white/40">
            Just want the basics? <Link to="/" className="text-white underline">Listen free with ads.</Link>
          </div>
        )}
      </div>

      {clientSecret && activePlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden my-8">
            <button
              onClick={closeCheckout}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/80 text-white grid place-items-center hover:bg-black"
              aria-label="Close checkout"
            >
              <X className="h-4 w-4" />
            </button>
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      )}
    </div>
  );
}