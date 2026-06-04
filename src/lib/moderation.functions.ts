import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "@/lib/audit.server";

async function assertModOrHost(supabase: any, userId: string, streamId?: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isMod = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
  if (isMod) return;
  if (!streamId) throw new Error("Not authorized");
  const { data: s } = await supabase.from("streams").select("host_id").eq("id", streamId).maybeSingle();
  if (s?.host_id !== userId) throw new Error("Not authorized");
}

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ messageId: z.string().uuid(), streamId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModOrHost(supabase, userId, data.streamId);
    const { error } = await supabase.from("stream_messages").delete().eq("id", data.messageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const timeoutUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      minutes: z.number().int().min(1).max(60 * 24),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModOrHost(supabase, userId, data.streamId);
    const expiresAt = new Date(Date.now() + data.minutes * 60_000).toISOString();
    const { error } = await supabase.from("chat_timeouts").insert({
      stream_id: data.streamId,
      user_id: data.targetUserId,
      expires_at: expiresAt,
      issued_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true, expiresAt };
  });

export const banUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      targetUserId: z.string().uuid(),
      reason: z.string().max(500).optional(),
      days: z.number().int().min(0).max(3650).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModOrHost(supabase, userId);
    const expires_at = data.days && data.days > 0
      ? new Date(Date.now() + data.days * 86_400_000).toISOString()
      : null;
    const { error } = await supabase.from("user_bans").insert({
      user_id: data.targetUserId,
      banned_by: userId,
      reason: data.reason,
      expires_at,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unbanUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ banId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModOrHost(supabase, userId);
    const { error } = await supabase.from("user_bans").delete().eq("id", data.banId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addBannedWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ word: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModOrHost(supabase, userId);
    const { error } = await supabase
      .from("chat_word_filter")
      .insert({ word: data.word.trim().toLowerCase(), added_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeBannedWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModOrHost(supabase, userId);
    const { error } = await supabase.from("chat_word_filter").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endStreamAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModOrHost(supabase, userId);
    const { error } = await supabase.from("streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.streamId);
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: userId,
      action: "stream.end",
      category: "stream",
      targetType: "stream",
      targetId: data.streamId,
      summary: "Stream ended by admin",
    });
    return { ok: true };
  });