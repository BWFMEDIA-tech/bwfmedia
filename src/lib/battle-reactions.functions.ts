import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { performBattleReaction } from "@/lib/battle-reactions.server";

const ReactSchema = z.object({
  battle_id: z.string().uuid(),
  artist_id: z.string().uuid(),
  action: z.enum(["hype", "pass"]),
});

/**
 * Cast a Hype/Pass reaction. The acting user always comes from the verified
 * session (never the payload). One reaction per user per artist per battle,
 * enforced by the DB unique constraint inside react_to_battle().
 */
export const reactToBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReactSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      getRequest();
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      /* no request context */
    }

    return performBattleReaction({
      supabase,
      userId,
      battleId: data.battle_id,
      artistId: data.artist_id,
      action: data.action,
      ip,
      userAgent: ua,
    });
  });
