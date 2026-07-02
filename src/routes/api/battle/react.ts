// @auth-exempt: raw JSON endpoint for mobile/external callers — verifies the
// Supabase Bearer JWT inline with the exact same checks as requireSupabaseAuth
// (getClaims + sub), then delegates to the shared performBattleReaction core.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { performBattleReaction } from "@/lib/battle-reactions.server";

const BodySchema = z.object({
  // user_id is accepted for spec compatibility but purely advisory — the JWT
  // is authoritative. A mismatch is rejected outright.
  user_id: z.string().uuid().optional(),
  battle_id: z.string().uuid(),
  artist_id: z.string().uuid(),
  action: z.enum(["hype", "pass"]),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/battle/react")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return json(500, { error: "Supabase is not configured" });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return json(401, { error: "Missing Bearer token" });
        }
        const token = authHeader.slice("Bearer ".length);

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: authError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (authError || !userId) {
          return json(401, { error: "Invalid token" });
        }

        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch (e) {
          return json(400, {
            error: "Invalid payload",
            details: e instanceof z.ZodError ? e.issues : undefined,
          });
        }
        if (body.user_id && body.user_id !== userId) {
          return json(403, { error: "user_id does not match the authenticated user" });
        }

        const ip =
          request.headers.get("cf-connecting-ip")?.trim() ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;

        try {
          const result = await performBattleReaction({
            supabase,
            userId,
            battleId: body.battle_id,
            artistId: body.artist_id,
            action: body.action,
            ip,
            userAgent: request.headers.get("user-agent"),
          });
          return json(200, result);
        } catch (e) {
          if (e instanceof Response) return e;
          return json(500, { error: e instanceof Error ? e.message : "Reaction failed" });
        }
      },
    },
  },
});
