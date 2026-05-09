import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, ArrowLeft, Mail, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/cancel")({
  head: () => ({
    meta: [
      { title: "Checkout Cancelled — BWF Media" },
      { name: "description", content: "Your checkout was cancelled. Your cart is still saved." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutCancel,
});

function CheckoutCancel() {
  const { items, totalCount, openCart } = useCart();
  const navigate = useNavigate();

  // Auto-open the cart drawer when the user lands here after cancelling.
  useEffect(() => {
    if (totalCount > 0) openCart();
  }, [totalCount, openCart]);

  const handleReturnToCart = () => {
    openCart();
    navigate({ to: "/" });
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
          No worries — your payment was not processed and you have not been charged.
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
