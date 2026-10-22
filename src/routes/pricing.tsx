import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "@/lib/auth-context";
import { createTunevioCheckout, TUNEVIO_PLANS, type TunevioPlanId } from "@/lib/tunevio-subscriptions.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Tunevio Pricing — Streaming & Artist Plans" },
      { name: "description", content: "Explore Tunevio's free Artist Starter and optional listener, artist and label plans." },
      { property: "og:title", content: "Tunevio Pricing — Streaming & Artist Plans" },
      { property: "og:description", content: "Explore Tunevio's free Artist Starter and optional listener, artist and label plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Tab = "listener" | "artist";

const FEATURES: Record<TunevioPlanId, string[]> = {
  listener_premium:     ["Ad-free streaming", "Unlimited skips", "High-quality audio", "Offline listening"],
  listener_fan_premium: ["Everything in Premium", "Exclusive fan-only drops", "Early access to releases", "Direct artist messaging"],
  listener_student:     ["Ad-free streaming", "Verified student discount", "Unlimited skips", "Cancel anytime"],
  artist_starter:       ["Artist registration and public profile", "Upload eligible music to Tunevio", "Upload a limited number of music videos, subject to storage and moderation limits", "Basic streaming and audience analytics", "Join the Battle Arena and compete in eligible battles", "Join another artist's live stage when invited or permitted", "Go live with reasonable usage limits", "Receive eligible earnings and view payout statements"],
  artist_pro:           ["Everything in Starter", "Advanced analytics and audience insights", "Promotional boosts and featured-placement tools", "Scheduled live events and promotional tools", "Enhanced artist profile customization", "Priority support", "Additional live-stream capabilities, if usage costs justify them"],
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
      window.location.href = `/signup`;
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
    <div className="swara-pricing min-h-screen bg-background text-foreground pt-12 pb-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Sparkles className="h-3 w-3" /> Tunevio Plans
          </div>
          <h1 className="text-3xl md:text-5xl font-bold">
            Choose your Tunevio plan
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Premium streaming for fans. Pro tools for artists and labels. Cancel anytime.
          </p>
          <div className="mt-5 mx-auto max-w-xl">
            <p className="text-sm text-muted-foreground">Artists can start free with Artist Starter. Paid plans include a 30-day free trial — you won't be charged until day 31. Cancel anytime.</p>
          </div>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex gap-2 rounded-full border border-border p-1" role="group" aria-label="Plan audience">
            {(["listener", "artist"] as Tab[]).map((t) => (
              <Button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                variant={tab === t ? "secondary" : "ghost"}
                className={`px-6 py-2 text-sm font-bold uppercase tracking-wider rounded-full transition ${
                  tab === t ? "bg-foreground text-background hover:bg-foreground/90" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "listener" ? "For Listeners" : "For Artists"}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
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
                className={`swara-plan-card relative flex flex-col rounded-lg p-6 border bg-card ${
                  isHighlighted
                    ? "border-primary/60"
                    : "border-border"
                }`}
              >
                {tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                    {tag}
                  </div>
                )}
                <h2 className="text-xl font-semibold text-primary">{plan.label}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.priceCents === 0 ? "0" : (plan.priceCents / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground">
                  {plan.priceCents === 0 ? "Included free" : "First 30 days free"}
                </div>
                <ul className="mt-6 mb-6 flex-1 space-y-4 border-t border-border pt-5 text-sm">
                  {FEATURES[planId].map((f) => (
                    <li key={f} className="flex gap-3 text-brand-silver">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => (plan.priceCents === 0 ? (window.location.href = "/signup") : startCheckout(planId))}
                  disabled={loadingPlan === planId}
                  className={`h-auto min-h-12 w-full whitespace-normal rounded-full px-4 py-3 font-semibold ${
                    isHighlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                >
                  {loadingPlan === planId ? <Loader2 className="h-4 w-4 animate-spin" /> : plan.priceCents === 0 ? "Get started free" : "Start 30-day free trial"}
                </Button>
              </div>
            );
          })}
        </div>

        {tab === "listener" && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            Just want the basics? <Link to="/" className="text-foreground underline">Listen free with ads.</Link>
          </div>
        )}
      </div>

      {clientSecret && activePlan && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-foreground rounded-lg overflow-hidden my-8">
            <Button
              onClick={closeCheckout}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-background/80 text-foreground grid place-items-center hover:bg-background"
              aria-label="Close checkout"
            >
              <X className="h-4 w-4" />
            </Button>
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      )}
    </div>
  );
}