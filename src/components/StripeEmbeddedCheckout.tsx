import { useCallback, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCartCheckoutSession } from "@/utils/payments.functions";

interface Props {
  items: Array<{ priceId: string; quantity: number }>;
  customerEmail?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckoutCart({ items, customerEmail, returnUrl }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const cs = await createCartCheckoutSession({
        data: {
          items,
          customerEmail,
          returnUrl: returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if (!cs) throw new Error("No client secret returned");
      setError(null);
      return cs;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    }
  }, [items, customerEmail, returnUrl]);

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-4 bg-white">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display text-xl text-neutral-900 mb-1">Checkout couldn't start</h3>
          <p className="text-sm text-neutral-600 max-w-sm">
            We hit a snag preparing your payment. This usually clears up on a retry. If it keeps
            happening, double-check your email, try a different card, or reach out and we'll sort it.
          </p>
          <p className="mt-3 text-xs text-neutral-400 font-mono break-words max-w-sm">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white font-cond tracking-widest text-xs uppercase hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider key={attempt} stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}