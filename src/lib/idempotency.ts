import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Run a handler at-most-once per (userId, key).
 * Concurrent duplicates are protected by the UNIQUE (user_id, idempotency_key)
 * constraint on request_idempotency — on conflict we re-read the winner's
 * cached response so both callers receive the same result.
 */
export async function runIdempotent<T>({
  supabase,
  userId,
  key,
  action,
  handler,
}: {
  supabase: SupabaseClient<any, any, any>;
  userId: string;
  key: string;
  action: string;
  handler: () => Promise<T>;
}): Promise<T> {
  if (!userId) throw new Error("runIdempotent: userId required");
  if (!key) throw new Error("runIdempotent: key required");
  if (!action) throw new Error("runIdempotent: action required");

  const { data: existing, error: readErr } = await supabase
    .from("request_idempotency")
    .select("response")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .maybeSingle();

  if (readErr && readErr.code !== "PGRST116") throw readErr;
  if (existing && existing.response != null) {
    return existing.response as T;
  }

  const result = await handler();

  const { error: insertErr } = await supabase
    .from("request_idempotency")
    .insert({
      user_id: userId,
      idempotency_key: key,
      action,
      response: (result ?? null) as any,
    });

  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: winner } = await supabase
        .from("request_idempotency")
        .select("response")
        .eq("user_id", userId)
        .eq("idempotency_key", key)
        .maybeSingle();
      if (winner && winner.response != null) {
        return winner.response as T;
      }
    } else {
      console.error("[runIdempotent] failed to persist response", insertErr);
    }
  }

  return result;
}