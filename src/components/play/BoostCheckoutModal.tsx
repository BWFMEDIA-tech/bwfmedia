import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
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
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0d0d18] border border-white/10 rounded-2xl">
        <button onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/10 hover:bg-white/20 p-1.5">
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