import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/auth-context";
import {
  confirmTunevioCheckout,
  TUNEVIO_PLANS,
  type TunevioPlanId,
} from "@/lib/tunevio-subscriptions.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Checkout Confirmation — Tunevio" },
      { name: "description", content: "Confirm your Tunevio purchase and membership." },
      { property: "og:title", content: "Checkout Confirmation — Tunevio" },
      { property: "og:description", content: "Confirm your Tunevio purchase and membership." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

type ReturnState =
  | { status: "verifying" }
  | { status: "missing" }
  | { status: "signin" }
  | { status: "generic" }
  | { status: "error"; message: string }
  | { status: "plan"; planType: string; priceCents: number | null; renewalDate: string | null };

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const { clear } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ReturnState>({ status: sessionId ? "verifying" : "missing" });

  useEffect(() => {
    if (sessionId) clear();
  }, [sessionId, clear]);

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "missing" });
      return;
    }
    if (authLoading) return;
    if (!user) {
      setState({ status: "signin" });
      return;
    }

    let active = true;
    setState({ status: "verifying" });
    void confirmTunevioCheckout({
      data: { sessionId, environment: sessionId.startsWith("cs_test_") ? "sandbox" : "live" },
    }).then((result) => {
      if (!active) return;
      if (result.kind === "other_checkout") {
        setState({ status: "generic" });
      } else if (result.kind === "error") {
        setState({ status: "error", message: result.error });
      } else {
        setState({
          status: "plan",
          planType: result.subscription.plan_type,
          priceCents: result.subscription.price_cents,
          renewalDate: result.subscription.renewal_date,
        });
      }
    }).catch((error: unknown) => {
      if (active) setState({
        status: "error",
        message: error instanceof Error ? error.message : "We could not confirm this checkout.",
      });
    });

    return () => { active = false; };
  }, [sessionId, user, authLoading, attempt]);

  const plan = state.status === "plan"
    ? TUNEVIO_PLANS[state.planType as TunevioPlanId]
    : undefined;

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-5 py-16 text-foreground">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 text-center shadow-2xl sm:p-10">
        {state.status === "verifying" ? (
          <>
            <Loader2 className="mx-auto mb-6 h-14 w-14 animate-spin text-primary" />
            <h1 className="text-3xl font-bold">Confirming your checkout</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              We’re verifying your payment and activating your Tunevio plan.
            </p>
          </>
        ) : state.status === "plan" ? (
          <>
            <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-primary" />
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">Payment confirmed</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Welcome to {plan?.label ?? state.planType}</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Your Tunevio membership is active and ready to use.
            </p>
            <div className="my-7 rounded-xl border border-primary/30 bg-background p-5">
              <div className="text-xl font-semibold">{plan?.label ?? state.planType}</div>
              {state.priceCents != null && (
                <div className="mt-1 text-muted-foreground">${(state.priceCents / 100).toFixed(2)}/month</div>
              )}
              {state.renewalDate && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Renews {new Date(state.renewalDate).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="min-h-12 rounded-full px-6">
                <Link to="/settings/billing">View my billing</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-12 rounded-full px-6">
                <Link to="/">Back to Tunevio</Link>
              </Button>
            </div>
          </>
        ) : state.status === "generic" ? (
          <>
            <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-primary" />
            <h1 className="text-3xl font-bold sm:text-4xl">Payment complete</h1>
            <p className="my-7 text-sm leading-6 text-muted-foreground">
              Thank you. Your Tunevio payment was completed successfully.
            </p>
            <Button asChild className="min-h-12 rounded-full px-8">
              <Link to="/">Back to Tunevio</Link>
            </Button>
          </>
        ) : state.status === "signin" ? (
          <>
            <h1 className="text-3xl font-bold">Sign in to confirm your plan</h1>
            <p className="my-7 text-sm leading-6 text-muted-foreground">
              Use the same Tunevio account you used during checkout.
            </p>
            <Button asChild className="min-h-12 rounded-full px-8">
              <Link to="/login">Sign in</Link>
            </Button>
          </>
        ) : state.status === "missing" ? (
          <>
            <h1 className="text-3xl font-bold">Checkout reference missing</h1>
            <p className="my-7 text-sm leading-6 text-muted-foreground">
              Open your billing settings to check your current Tunevio plan.
            </p>
            <Button asChild className="min-h-12 rounded-full px-8">
              <Link to="/settings/billing">Open billing</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">We couldn’t confirm this checkout</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{state.message}</p>
            <p className="mb-7 mt-2 text-sm leading-6 text-muted-foreground">
              Your payment may still be processing. Try again, or check Settings → Billing.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => setAttempt((value) => value + 1)} className="min-h-12 rounded-full px-6">
                <RefreshCw /> Try again
              </Button>
              <Button asChild variant="outline" className="min-h-12 rounded-full px-6">
                <Link to="/settings/billing">Open billing</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
