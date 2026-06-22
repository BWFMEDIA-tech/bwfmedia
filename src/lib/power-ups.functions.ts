import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PowerUp = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string | null;
  accent: string | null;
  cost_credits: number;
  multiplier: number;
  duration_minutes: number;
};

export type PowerUpActivation = {
  id: string;
  power_up_id: string;
  slug: string;
  title: string;
  activated_at: string;
  expires_at: string;
  credits_spent: number;
};

export const listPowerUps = createServerFn({ method: "GET" }).handler(
  async (): Promise<PowerUp[]> => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await sb
      .from("arena_power_ups")
      .select("id, slug, title, description, icon, accent, cost_credits, multiplier, duration_minutes")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PowerUp[];
  },
);

export const getMyPowerUpStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ credits: number; active: PowerUpActivation[] }> => {
    const { supabase, userId } = context;
    const [creditsRes, actRes] = await Promise.all([
      supabase.from("play_boost_credits").select("credits").eq("user_id", userId).maybeSingle(),
      supabase
        .from("arena_power_up_activations")
        .select("id, power_up_id, activated_at, expires_at, credits_spent, arena_power_ups(slug, title)")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false }),
    ]);
    const credits = (creditsRes.data as any)?.credits ?? 0;
    const active: PowerUpActivation[] = ((actRes.data as any[]) ?? []).map((r) => ({
      id: r.id,
      power_up_id: r.power_up_id,
      slug: r.arena_power_ups?.slug ?? "",
      title: r.arena_power_ups?.title ?? "",
      activated_at: r.activated_at,
      expires_at: r.expires_at,
      credits_spent: r.credits_spent,
    }));
    return { credits, active };
  });

export const activatePowerUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => {
    if (!data?.slug || typeof data.slug !== "string") throw new Error("slug required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rpc, error } = await supabase.rpc("activate_power_up" as any, { _slug: data.slug });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rpc) ? rpc[0] : rpc;
    return {
      activationId: row?.activation_id as string,
      newBalance: row?.new_balance as number,
      expiresAt: row?.expires_at as string,
    };
  });