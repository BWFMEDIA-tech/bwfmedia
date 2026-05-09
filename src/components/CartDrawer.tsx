import { useState } from "react";
import { ShoppingCart, X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { StripeEmbeddedCheckoutCart } from "@/components/StripeEmbeddedCheckout";
import { useNavigate } from "@tanstack/react-router";

function formatUSD(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function CartButton() {
  const { totalCount, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open cart, ${totalCount} item${totalCount === 1 ? "" : "s"}`}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-black/80 backdrop-blur border border-bone/20 hover:border-bone/60 transition-colors text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
    >
      <ShoppingCart className="w-4 h-4" />
      <span>Cart</span>
      {totalCount > 0 && (
        <span
          className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[11px] font-bold text-white"
          style={{ backgroundColor: "var(--blood)" }}
        >
          {totalCount}
        </span>
      )}
    </button>
  );
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, setQuantity, totalCents, clear, email, setEmail } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const checkoutItems = items.map((i) => ({ priceId: i.priceId, quantity: i.quantity }));

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeCart}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <aside
        className="relative w-full max-w-md h-full bg-[#0a0a0a] border-l border-bone/10 flex flex-col overflow-hidden"
        role="dialog"
        aria-label="Shopping cart"
      >
        <header className="flex items-center justify-between p-5 border-b border-bone/10">
          <h2 className="font-display text-2xl text-bone tracking-tight">
            {checkingOut ? "CHECKOUT" : "YOUR CART"}
          </h2>
          <button
            type="button"
            onClick={() => (checkingOut ? setCheckingOut(false) : closeCart())}
            className="text-bone/70 hover:text-bone p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {checkingOut ? (
          <div className="flex-1 overflow-y-auto bg-white flex flex-col">
            <div className="flex-1">
              <StripeEmbeddedCheckoutCart items={checkoutItems} customerEmail={email || undefined} />
            </div>
            <button
              type="button"
              onClick={() => {
                setCheckingOut(false);
                closeCart();
                navigate({ to: "/checkout/cancel" });
              }}
              className="w-full py-3 bg-white border-t border-neutral-200 text-neutral-600 hover:text-neutral-900 font-cond tracking-widest text-[11px] uppercase"
            >
              Cancel checkout
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-bone/30 mb-4" />
            <p className="text-bone/70 font-cond tracking-wider uppercase text-sm">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.map((it) => (
                <div key={it.priceId} className="flex gap-4 p-4 border border-bone/10 bg-black/40">
                  <div className="flex-1">
                    <div className="font-display text-bone text-lg leading-tight mb-1">{it.name}</div>
                    <div className="font-cond tracking-widest text-xs uppercase mb-3" style={{ color: "var(--blood)" }}>
                      {formatUSD(it.unitAmount)}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-bone/20">
                        <button
                          type="button"
                          onClick={() => setQuantity(it.priceId, it.quantity - 1)}
                          className="p-2 text-bone/70 hover:text-bone"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 font-mono text-bone text-sm">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(it.priceId, it.quantity + 1)}
                          className="p-2 text-bone/70 hover:text-bone"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.priceId)}
                        className="text-bone/50 hover:text-bone p-1"
                        aria-label={`Remove ${it.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="font-display text-bone text-lg whitespace-nowrap">
                    {formatUSD(it.unitAmount * it.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <footer className="p-5 border-t border-bone/10 space-y-4">
              <div>
                <label htmlFor="cart-email" className="block font-cond tracking-widest text-[10px] uppercase text-bone/60 mb-2">
                  Email (optional, for receipt)
                </label>
                <input
                  id="cart-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-black/60 border border-bone/20 px-3 py-2 text-bone text-sm focus:outline-none focus:border-bone/60"
                />
              </div>
              <div className="flex items-center justify-between font-display text-2xl text-bone">
                <span>TOTAL</span>
                <span style={{ color: "var(--blood)" }}>{formatUSD(totalCents)}</span>
              </div>
              <button
                type="button"
                onClick={() => setCheckingOut(true)}
                className="w-full py-4 font-cond font-bold tracking-[0.25em] text-sm uppercase text-bone hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--blood)" }}
              >
                Checkout
              </button>
              <button
                type="button"
                onClick={clear}
                className="w-full py-2 font-cond tracking-widest text-[11px] uppercase text-bone/50 hover:text-bone/80"
              >
                Clear cart
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}