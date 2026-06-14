import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/membership")({ component: MembershipPage });

function MembershipPage() {
  const { user } = useAuth();
  const [m, setM] = useState<any>(null);
  const [boost, setBoost] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("play_memberships").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("play_boost_credits").select("credits").eq("user_id", user.id).maybeSingle(),
    ]).then(([{ data: mem }, { data: bc }]) => { setM(mem); setBoost((bc as any)?.credits ?? 0); setLoading(false); });
  }, [user]);

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Membership" blurb="Your BWF plan and perks.">
      <Card>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-red-600 to-purple-600"><Crown className="h-6 w-6 text-white" /></div>
          <div className="flex-1">
            <div className="text-lg font-black">{m?.tier ? String(m.tier).toUpperCase() : "Free Member"}</div>
            <div className="text-xs text-white/60">{m?.status === "active" ? "Active subscription" : "Upgrade to unlock priority placement."}</div>
          </div>
          <a href="/artist/upgrade" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500">Upgrade</a>
        </div>
      </Card>
      <Card title="Play Boost Credits">
        <div className="text-3xl font-black tabular-nums">{boost}</div>
      </Card>
    </SettingsShell>
  );
}