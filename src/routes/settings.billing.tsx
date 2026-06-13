import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/billing")({ component: BillingPage });

function BillingPage() {
  const { user } = useAuth();
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("tips").select("id, amount_cents, status, created_at, message").eq("user_id", user.id).eq("status", "paid").order("created_at", { ascending: false }).limit(20).then(({ data }) => {
      setTips(data ?? []); setLoading(false);
    });
  }, [user]);

  const total = tips.reduce((s, t) => s + (t.amount_cents ?? 0), 0);
  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Billing" blurb="Recent tips and payments.">
      <Card><div className="text-xs uppercase tracking-widest text-white/50">Total sent</div><div className="mt-1 text-3xl font-black">${(total / 100).toFixed(2)}</div></Card>
      <Card title="Recent Tips" icon={<Receipt className="h-4 w-4 text-red-500" />}>
        {tips.length === 0 ? <div className="py-6 text-center text-sm text-white/50">No tips yet.</div> : (
          <ul className="divide-y divide-white/5 text-sm">
            {tips.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div><div className="font-semibold">${(t.amount_cents / 100).toFixed(2)}</div>{t.message && <div className="text-xs text-white/50">"{t.message}"</div>}</div>
                <div className="text-xs text-white/40">{new Date(t.created_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </SettingsShell>
  );
}