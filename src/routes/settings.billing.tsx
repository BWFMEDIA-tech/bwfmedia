import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Receipt, CreditCard, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { getMyTunevioSubscription, createTunevioPortal } from "@/lib/tunevio-subscriptions.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { TUNEVIO_PLANS, type TunevioPlanId } from "@/lib/tunevio-subscriptions.functions";

export const Route = createFileRoute("/settings/billing")({ head: () => ({ meta: [{ title: "Billing & Subscriptions — Tunevio" }, { name: "description", content: "Manage your existing Tunevio subscription and view paid tips." }, { property: "og:title", content: "Billing & Subscriptions — Tunevio" }, { property: "og:description", content: "Your Tunevio subscription and payment history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: BillingPage });

function BillingPage() {
  const { user } = useAuth();
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("tips").select("id, amount_cents, status, created_at, message").eq("user_id", user.id).eq("status", "paid").order("created_at", { ascending: false }).limit(20).then(({ data }) => {
      setTips(data ?? []); setLoading(false);
    });
    getMyTunevioSubscription({ data: { environment: getStripeEnvironment() } })
      .then((s) => setSub(s))
      .catch(() => setSub(null));
  }, [user]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const result = await createTunevioPortal({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/settings/billing` },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e: any) {
      alert(e?.message ?? "Failed to open portal");
    } finally {
      setPortalLoading(false);
    }
  }

  const total = tips.reduce((s, t) => s + (t.amount_cents ?? 0), 0);
  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const planLabel = sub?.plan_type && (TUNEVIO_PLANS as any)[sub.plan_type as TunevioPlanId]?.label;
  const isActive = sub && ["active", "trialing", "past_due"].includes(sub.status);

  return (
    <SettingsShell title="Manage subscriptions">
      <Card title="Subscription" icon={<CreditCard className="h-4 w-4 text-primary" />}>
        {isActive ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{planLabel ?? sub.plan_type}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">{sub.role} · {sub.status}</div>
              </div>
              <div className="text-right text-sm">
                {sub.price_cents != null && <div>${(sub.price_cents / 100).toFixed(2)}/mo</div>}
                {sub.renewal_date && (
                  <div className="text-xs text-muted-foreground">
                    {sub.cancel_at_period_end ? "Ends" : "Renews"} {new Date(sub.renewal_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <Button onClick={openPortal} disabled={portalLoading} variant="outline" className="w-full">
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Manage subscription <ExternalLink className="h-3 w-3 ml-2" /></>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">You're on the free plan.</div>
            <Button asChild className="w-full bg-foreground text-background rounded-full font-medium">
              <Link to="/pricing">See plans</Link>
            </Button>
          </div>
        )}
      </Card>
      <Card><div className="text-xs uppercase tracking-widest text-muted-foreground">Total sent</div><div className="mt-1 text-3xl font-black">${(total / 100).toFixed(2)}</div></Card>
      <Card title="Recent Tips" icon={<Receipt className="h-4 w-4 text-primary" />}>
        {tips.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No tips yet.</div> : (
          <ul className="divide-y divide-border/50 text-sm">
            {tips.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div><div className="font-semibold">${(t.amount_cents / 100).toFixed(2)}</div>{t.message && <div className="text-xs text-muted-foreground">"{t.message}"</div>}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </SettingsShell>
  );
}