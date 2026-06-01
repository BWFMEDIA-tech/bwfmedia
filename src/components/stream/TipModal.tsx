import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createTipCheckout } from "@/lib/tips.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import type { AuthState } from "@/lib/auth-context";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";
const PRESETS = [5, 10, 20, 50];

export function TipModal({
  streamId,
  auth,
  onClose,
}: {
  streamId: string;
  auth: AuthState;
  onClose: () => void;
}) {
  const tipFn = useServerFn(createTipCheckout);
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? Math.max(1, Math.min(500, Number(custom) || 0)) : amount;

  const start = async () => {
    if (!finalAmount || finalAmount < 1) {
      toast.error("Minimum tip is $1");
      return;
    }
    setLoading(true);
    const result = await tipFn({
      data: {
        streamId,
        amountCents: Math.round(finalAmount * 100),
        message: message || undefined,
        displayName: auth.displayName || auth.user?.email || "Anonymous",
        returnUrl: `${window.location.origin}/stream-studio?tip=success`,
        environment: getStripeEnvironment(),
      },
    });
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setClientSecret(result.clientSecret);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d18]">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1.5 text-white/70 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>

        {!clientSecret ? (
          <div className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: PURPLE }} />
              <h2 className="text-lg font-bold text-white">Send a tip</h2>
            </div>
            <p className="mb-4 text-xs text-white/50">Support the host. Tips appear in chat as super chats.</p>

            <div className="mb-3 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setAmount(p); setCustom(""); }}
                  className="rounded-lg border border-white/10 px-3 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                  style={amount === p && !custom ? { background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})`, borderColor: "transparent" } : undefined}
                >
                  ${p}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={1}
              max={500}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom amount ($)"
              className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)"
              maxLength={200}
              rows={2}
              className="mb-4 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />

            <button
              onClick={start}
              disabled={loading || finalAmount < 1}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
            >
              {loading ? "Preparing checkout…" : `Tip $${finalAmount.toFixed(2)}`}
            </button>
          </div>
        ) : (
          <div className="max-h-[85vh] overflow-y-auto bg-white">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}