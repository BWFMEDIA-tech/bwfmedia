import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getStripeEnvironment } from "@/lib/stripe";
import { getMyArtistSubscription } from "@/lib/artist-subscription.functions";

export function useArtistSubscription() {
  const { isAuthenticated, user } = useAuth();
  const fetcher = useServerFn(getMyArtistSubscription);

  const query = useQuery({
    queryKey: ["artist-subscription", user?.id],
    enabled: isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const env = getStripeEnvironment();
      return await fetcher({ data: { environment: env } });
    },
  });

  const sub = query.data?.subscription ?? null;
  const now = Date.now();
  const periodEndMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const trialEndMs = sub?.trial_end ? new Date(sub.trial_end).getTime() : null;

  const isTrialing = !!sub && sub.status === "trialing" && (!periodEndMs || periodEndMs > now);
  const isPaidActive = !!sub && ["active", "past_due"].includes(sub.status) && (!periodEndMs || periodEndMs > now);
  const isCanceledGrace = !!sub && sub.status === "canceled" && !!periodEndMs && periodEndMs > now;
  const isActive = isTrialing || isPaidActive || isCanceledGrace;

  const trialEndsAt = trialEndMs ? new Date(trialEndMs) : null;
  const daysLeft = trialEndMs ? Math.max(0, Math.ceil((trialEndMs - now) / (1000 * 60 * 60 * 24))) : null;

  return {
    subscription: sub,
    isActive,
    isTrialing,
    isPaidActive,
    isCanceledGrace,
    trialEndsAt,
    daysLeft,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}