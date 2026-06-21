import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VoteAttempt = {
  id: string;
  match_id: string | null;
  voter_id: string | null;
  outcome: "allowed" | "blocked";
  reason: string;
  metadata: any;
  created_at: string;
};

const FilterSchema = z.object({
  match_id: z.string().uuid().optional().nullable(),
  voter_id: z.string().uuid().optional().nullable(),
  reason: z.string().min(1).max(120).optional().nullable(),
  outcome: z.enum(["allowed", "blocked"]).optional().nullable(),
  since: z.string().datetime().optional().nullable(),
  until: z.string().datetime().optional().nullable(),
  limit: z.number().int().min(1).max(500).default(100),
});

export const listVoteAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FilterSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    let q = supabase
      .from("battle_vote_attempts")
      .select("id, match_id, voter_id, outcome, reason, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.match_id) q = q.eq("match_id", data.match_id);
    if (data.voter_id) q = q.eq("voter_id", data.voter_id);
    if (data.reason) q = q.ilike("reason", `%${data.reason}%`);
    if (data.outcome) q = q.eq("outcome", data.outcome);
    if (data.since) q = q.gte("created_at", data.since);
    if (data.until) q = q.lte("created_at", data.until);

    const { data: rows, error } = await q;
    if (error) throw error;
    return { entries: (rows ?? []) as VoteAttempt[] };
  });