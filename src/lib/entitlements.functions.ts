import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { perksFor, type SubRow } from "./entitlements";

export const getMyEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const [{ data: subs }, { data: isAdmin }] = await Promise.all([
      sb.from("subscriptions").select("plan_type, price_id, status, current_period_end").eq("user_id", context.userId),
      sb.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    return { perks: perksFor((subs ?? []) as SubRow[], !!isAdmin) };
  });
