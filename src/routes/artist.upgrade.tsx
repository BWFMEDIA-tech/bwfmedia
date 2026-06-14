import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Check, Sparkles, ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  createArtistTrialCheckout,
  createArtistPortalSession,
} from "@/lib/artist-subscription.functions";
import { useArtistSubscription } from "@/hooks/useArtistSubscription";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/artist/upgrade")({
  head: () => ({
    meta: [
      { title: "Start your 7-day free Artist trial — BWF Network" },
      { name: "description", content: "Get full artist access on BWF Network: uploads, live streaming, monetization, promo tools. 7 days free, then $6.99/month. Cancel anytime." },
      { property: "og:title", content: "BWF Network Artist Membership — 7-day free trial" },
      { property: "og:description", content: "Stream, sell, and grow on BWF Network. 7 days free, $6.99/mo after." },
    ],
  }),
  component: ArtistUpgradePage,
});

const PERKS = [
  "Unlimited music & video uploads",
  "Live broadcasting + audio rooms",
  "Sell merch & memberships",
  "Tips, virtual gifts, paid reviews",
  "Artist promo placements & boosts",
  "Real-time analytics dashboard",
];

function ArtistUpgradePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const sub = useArtistSubscription();
  const [showCheckout, setShowCheckout] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const startCheckout = useServerFn(createArtistTrialCheckout);
  const startPortal = useServerFn(createArtistPortalSession);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const res = await startCheckout({
      data: {
        environment: getStripeEnvironment(),
        customerEmail: auth.user?.email ?? undefined,
        returnUrl: `${window.location.origin}/artist/upgrade?status=success&session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error("No client secret returned");
    return res.clientSecret;
  }, [auth.user?.email, startCheckout]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await startPortal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/artist/upgrade`,
        },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (!auth.loading && !auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign in to start your trial</h1>
          <p className="text-white/60">You need an account to start the Artist Membership free trial.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/login" className="px-5 py-2 rounded-full bg-white text-black font-semibold">Sign in</Link>
            <Link to="/signup" className="px-5 py-2 rounded-full border border-white/20">Create account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <PaymentTestModeBanner />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-white/60 hover:text-white text-sm flex items-center gap-2 mb-6"
        >
          <ArrowLeft size={14} /> Back to BWF
        </button>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-600/30 to-cyan-500/30 border border-white/10 text-xs uppercase tracking-wider mb-4">
              <Sparkles size={12} /> Artist Membership
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-3">
              7 days free.<br/>Then <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">$6.99</span>/mo.
            </h1>
            <p className="text-white/70 mb-6">
              Full access to upload, broadcast, monetize, and grow on BWF Network. Cancel anytime from your billing portal.
            </p>

            <ul className="space-y-2.5 mb-8">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-white/85">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-fuchsia-600/20 border border-fuchsia-500/40 grid place-items-center shrink-0">
                    <Check size={12} className="text-fuchsia-300" />
                  </span>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ul>

            {sub.isActive ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm">
                  <div className="font-semibold mb-1">
                    {sub.isTrialing
                      ? `You're on a free trial — ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left`
                      : sub.isCanceledGrace
                      ? "Membership canceled — access until period end"
                      : "Artist Membership active"}
                  </div>
                  {sub.subscription?.cancel_at_period_end && (
                    <div className="text-white/60 text-xs flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Auto-renew is off.
                    </div>
                  )}
                </div>
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-60"
                >
                  {portalLoading ? "Opening…" : <>Manage billing <ExternalLink size={14} /></>}
                </button>
              </div>
            ) : !showCheckout ? (
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full md:w-auto px-7 py-3.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-bold hover:opacity-95 transition"
              >
                Start 7-day free trial
              </button>
            ) : (
              <p className="text-xs text-white/50">Card required. You won't be charged until your trial ends. Cancel anytime.</p>
            )}
          </div>

          <div>
            {showCheckout && !sub.isActive ? (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-white">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-600/10 via-pink-600/10 to-cyan-500/10 p-8 md:p-10 h-full flex flex-col justify-center">
                <div className="text-6xl font-bold mb-2">$6.99<span className="text-xl text-white/60 font-normal">/mo</span></div>
                <div className="text-white/70 mb-6">After your 7-day free trial</div>
                <div className="space-y-2 text-sm text-white/80">
                  <div className="flex items-center gap-2"><Check size={14} className="text-cyan-400" /> No charge for 7 days</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-cyan-400" /> Cancel anytime, no fees</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-cyan-400" /> Secure payment via Stripe</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}