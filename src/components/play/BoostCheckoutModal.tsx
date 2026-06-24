import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { X, Zap, Crown } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createBoostCheckout, createMembershipCheckout } from "@/lib/play-checkout.functions";

export function BoostCheckoutModal({
  kind, onClose,
}: { kind: "boost" | "membership"; onClose: () => void }) {
  const boostFn = useServerFn(createBoostCheckout);
  const memFn = useServerFn(createMembershipCheckout);
  const fetchClientSecret = async (): Promise<string> => {
    const returnUrl = `${window.location.origin}${window.location.pathname}?checkout=success`;
    const res = kind === "boost"
      ? await boostFn({ data: { returnUrl, environment: getStripeEnvironment() } })
      : await memFn({ data: { returnUrl, environment: getStripeEnvironment() } });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error("Stripe did not return a client secret");
    return res.clientSecret;
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 backdrop-blur-md bg-black/70">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#C53DFF]/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#00E6FF]/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF00A6]/20 blur-3xl" />
      </div>

      {/* Gradient border wrapper */}
      <div className="relative w-full max-w-xl rounded-3xl p-[1.5px] bg-gradient-to-br from-[#C53DFF] via-[#FF00A6] to-[#00E6FF] shadow-[0_20px_80px_-10px_rgba(197,61,255,0.5)]">
        <div className="relative rounded-[calc(1.5rem-1.5px)] bg-[#08080F] overflow-hidden">
          {/* Branded header */}
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-[#C53DFF]/10 via-transparent to-[#00E6FF]/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C53DFF] to-[#FF00A6] shadow-lg shadow-[#FF00A6]/30">
                {kind === "boost" ? (
                  <Zap className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                ) : (
                  <Crown className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                )}
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-bold tracking-[0.18em] text-white/50 uppercase">
                  BWF Network
                </div>
                <div className="text-sm font-semibold text-white">
                  {kind === "boost" ? "Boost Checkout" : "Artist Membership"}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full bg-white/5 hover:bg-white/15 transition-colors p-2 text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stripe iframe — Stripe controls its own styling. */}
          <div className="bg-white">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>

          {/* Branded footer */}
          <div className="px-5 py-3 border-t border-white/5 bg-[#08080F] text-center">
            <p className="text-[11px] text-white/40">
              Secure checkout · Powered by <span className="text-white/60 font-medium">BWF Network</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}