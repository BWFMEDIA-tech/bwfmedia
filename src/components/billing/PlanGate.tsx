import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyEntitlements } from "@/lib/entitlements.functions";
import { PERK_UPGRADE, type Perk } from "@/lib/entitlements";

export function useEntitlements() {
  const fetchFn = useServerFn(getMyEntitlements);
  return useQuery({ queryKey: ["my-entitlements"], queryFn: () => fetchFn(), staleTime: 60_000 });
}

export function useHasPerk(perk: Perk) {
  const q = useEntitlements();
  return { loading: q.isLoading, has: !!q.data?.perks?.includes(perk) };
}

export function PlanGate({ perk, title, children }: { perk: Perk; title: string; children: ReactNode }) {
  const { loading, has } = useHasPerk(perk);
  if (loading) return <div className="p-8 text-muted-foreground" role="status">Checking your plan…</div>;
  if (has) return <>{children}</>;
  const up = PERK_UPGRADE[perk];
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center">
      <Lock className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-3 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">This is included with {up.label}.</p>
      <Button asChild className="mt-5"><Link to="/pricing">Upgrade to {up.label}</Link></Button>
    </div>
  );
}
