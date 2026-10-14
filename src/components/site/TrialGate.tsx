import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getStripeEnvironment } from "@/lib/stripe";
import { getMyTunevioSubscription } from "@/lib/tunevio-subscriptions.functions";
import { hasTrialAccess } from "@/lib/trial";

/** Blocks a signed-in member's own profile until they start the 30-day trial (card on file). */
export function TrialGate({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const auth = useAuth();
  const fetchSub = useServerFn(getMyTunevioSubscription);
  const isAdmin = (auth.roles ?? []).includes("admin" as never);
  const active = enabled && !isAdmin;
  const q = useQuery({
    queryKey: ["tunevio-sub-gate", auth.user?.id],
    enabled: active,
    staleTime: 30_000,
    queryFn: () => fetchSub({ data: { environment: getStripeEnvironment() } }),
  });
  if (!active) return <>{children}</>;
  if (q.isLoading) return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (hasTrialAccess(q.data ?? null)) return <>{children}</>;
  return (
    <div className="min-h-[70vh] grid place-items-center px-6 pt-24">
      <div className="max-w-md text-center rounded-2xl border border-primary/40 bg-card p-8">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-4 text-2xl font-black">Start your 30-day free trial</h1>
        <p className="mt-3 text-sm text-muted-foreground">Add a card to unlock your profile. You won't be charged for 30 days, and you can cancel anytime.</p>
        <Link to="/pricing" className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Choose a plan</Link>
      </div>
    </div>
  );
}
