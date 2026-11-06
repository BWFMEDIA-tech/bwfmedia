type BattleNotification = {
  actorId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  streamId?: string | null;
  sourceEvent?: string;
};

/** Called only after the challenge action has authorized its actor. */
export async function notifyBattleUsers(userIds: string[], n: BattleNotification) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = [...new Set(userIds)].map((userId) => ({
    user_id: userId,
    actor_id: n.actorId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? "/play",
    stream_id: n.streamId ?? null,
    ...(n.sourceEvent ? { source_event: n.sourceEvent } : {}),
  }));
  if (!rows.length) return;
  const { error } = await supabaseAdmin.from("notifications").insert(rows);
  if (error) throw new Error("The battle was saved, but its notification could not be delivered. Please refresh before trying again.");
}