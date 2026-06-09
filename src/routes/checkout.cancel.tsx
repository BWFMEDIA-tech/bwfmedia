import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, ArrowLeft, Mail, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/cancel")({
  head: () => ({
    meta: [
      { title: "Checkout Cancelled - BWF Media" },
      { name: "description", content: "Your checkout was cancelled. Your cart is still saved." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutCancel,
});

function CheckoutCancel() {
  const { items, totalCount, totalCents, email, setEmail, openCart } = useCart();
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState(email);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const sentRef = useRef(false);

  // Build a stable cart fingerprint so the same recipient + cart isn't emailed twice.
  const cartFingerprint = items
    .map((i) => `${i.priceId}:${i.quantity}`)
    .sort()
    .join("|") || "empty";

  const sendCancellationEmail = async (recipient: string) => {
    if (sentRef.current) return;
    sentRef.current = true;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/public/checkout-cancellation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: recipient,
          cartFingerprint,
          returnUrl: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEmailStatus("sent");
    } catch (err) {
      console.error(err);
      setEmailStatus("error");
      sentRef.current = false;
    }
  };

  // Auto-open the cart drawer when the user lands here after cancelling.
  useEffect(() => {
    if (totalCount > 0) openCart();
  }, [totalCount, openCart]);

  // Auto-send if we already have an email saved from the cart.
  useEffect(() => {
    if (email && totalCount > 0) {
      void sendCancellationEmail(email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReturnToCart = () => {
    openCart();
    navigate({ to: "/" });
  };

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const v = emailInput.trim();
    if (!v) return;
    setEmail(v);
    void sendCancellationEmail(v);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div
          className="w-16 h-16 mx-auto mb-6 border flex items-center justify-center"
          style={{ borderColor: "var(--blood)" }}
        >
          <ShoppingCart className="w-7 h-7" style={{ color: "var(--blood)" }} />
        </div>

        <h1 className="font-display text-5xl text-bone mb-4 tracking-tight">CHECKOUT CANCELLED</h1>
        <p className="text-bone/70 mb-2">
          No worries - your payment was not processed and you have not been charged.
        </p>
        <p className="text-bone/70 mb-10">
          {totalCount > 0
            ? `Your cart still has ${totalCount} item${totalCount === 1 ? "" : "s"} waiting for you.`
            : "Your cart is currently empty."}
        </p>

        <div className="border border-bone/15 bg-black/40 p-6 mb-10 text-left space-y-4">
          <h2 className="font-cond tracking-[0.25em] text-xs uppercase text-bone/60 mb-2">
            What you can do next
          </h2>
          <div className="flex gap-3">
            <ShoppingCart className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--blood)" }} />
            <div>
              <div className="font-display text-bone text-lg leading-tight">Return to your cart</div>
              <p className="text-bone/60 text-sm">
                Review or adjust your items, then check out again whenever you're ready.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <HelpCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--blood)" }} />
            <div>
              <div className="font-display text-bone text-lg leading-tight">Had a payment issue?</div>
              <p className="text-bone/60 text-sm">
                Try a different card or payment method. Your saved cart will still be here.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--blood)" }} />
            <div>
              <div className="font-display text-bone text-lg leading-tight">Need help?</div>
              <p className="text-bone/60 text-sm">
                Reach out and we'll walk you through booking or answer any questions.
              </p>
            </div>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="border border-bone/15 bg-black/40 p-6 mb-10 text-left">
            <h2 className="font-cond tracking-[0.25em] text-xs uppercase text-bone/60 mb-3">
              Email me a link to my cart
            </h2>
            {emailStatus === "sent" ? (
              <p className="text-bone/80 text-sm">
                ✓ Sent. Check your inbox at <strong>{email || emailInput}</strong> for a link
                back to your cart and instructions to retry checkout.
              </p>
            ) : (
              <form onSubmit={handleSubmitEmail} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 bg-black/60 border border-bone/20 px-3 py-3 text-bone text-sm focus:outline-none focus:border-bone/60"
                />
                <button
                  type="submit"
                  disabled={emailStatus === "sending"}
                  className="px-5 py-3 font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "var(--blood)" }}
                >
                  {emailStatus === "sending" ? "Sending…" : "Send link"}
                </button>
              </form>
            )}
            {emailStatus === "error" && (
              <p className="text-red-300 text-xs mt-2">
                Couldn't send the email. Please try again or come back to the cart directly.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {items.length > 0 ? (
            <button
              type="button"
              onClick={handleReturnToCart}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "var(--blood)" }}
            >
              <ShoppingCart className="w-4 h-4" />
              Return to cart
            </button>
          ) : null}
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-bone/30 text-bone font-cond tracking-[0.25em] text-xs uppercase hover:bg-bone/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
