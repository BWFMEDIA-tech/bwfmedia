import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPushPublicKey = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async () => {
  const seed = process.env['WEB_PUSH_VAPID_SEED'];
  if (!seed) throw new Error("Push notifications are not configured yet");
  const { vapidFromSeed } = await import("./web-push.server");
  return { publicKey: (await vapidFromSeed(seed)).publicKey };
});

export const sendPushTest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({ endpoint: z.string().url().max(2000) }).parse(input)).handler(async ({ data, context }) => {
  const seed = process.env['WEB_PUSH_VAPID_SEED'];
  if (!seed) throw new Error("Push notifications are not configured yet");
  const { data: device } = await context.supabase.from("web_push_subscriptions").select("id").eq("endpoint", data.endpoint).eq("user_id", context.userId).eq("enabled", true).maybeSingle();
  if (!device) throw new Error("Enable notifications on this device first");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: rate, error: rateError } = await db.rpc("check_rate_limit", { _bucket_key: context.userId, _action: "push_test", _max_hits: 3, _window_secs: 3600 });
  if (rateError || !rate?.[0]?.allowed) throw new Error("Please wait before sending another test");
  const { data: notification, error } = await db.from("notifications").insert({ user_id: context.userId, type: "push_test", title: "TUNEVIO notification test", body: "Your device is connected to Tunevio notifications.", link: "/settings/notifications" }).select("id").single();
  if (error || !notification) throw new Error("Could not create test notification");
  const { deliverInboxPush } = await import("./web-push.server");
  return deliverInboxPush(notification.id, seed, data.endpoint);
});