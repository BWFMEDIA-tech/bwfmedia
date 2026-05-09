import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { clear } = useCart();

  useEffect(() => {
    if (session_id) clear();
  }, [session_id, clear]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-6">
      <div className="max-w-md text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-6" style={{ color: "var(--blood)" }} />
        <h1 className="font-display text-5xl text-bone mb-4 tracking-tight">PAYMENT COMPLETE</h1>
        <p className="text-bone/70 mb-8">
          Thank you. We'll be in touch shortly to coordinate your booking.
        </p>
        {session_id && (
          <p className="text-bone/30 font-mono text-xs mb-8 break-all">Ref: {session_id}</p>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-3 border border-bone/30 text-bone font-cond tracking-[0.25em] text-xs uppercase hover:bg-bone/10"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}