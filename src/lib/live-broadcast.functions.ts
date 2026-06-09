import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as React from "react";
import { render } from "@react-email/components";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SENDER_DOMAIN = "notify.bwfmedia.company";
const FROM_ADDRESS = `BWF Network <live@${SENDER_DOMAIN}>`;

/**
 * Broadcast "host went live" to every other authenticated user who opted in.
 * - Inserts an in-app notification row per recipient (RLS scoped read).
 * - Enqueues a single transactional email per recipient who has email + live_alerts on.
 * - Idempotent per stream_id via stable message_id on the log row.
 */
export const broadcastStreamStarted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ streamId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Load the stream + host display name. Bail if not live.
    const { data: stream } = await supabaseAdmin
      .from("streams")
      .select("id, title, room_name, status, host_id, category")
      .eq("id", data.streamId)
      .maybeSingle();
    if (!stream) throw new Error("Stream not found");
    if (stream.host_id !== actorId) {
      // also allow admin
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", actorId).eq("role", "admin").maybeSingle();
      if (!roleRow) throw new Error("Not authorized");
    }
    if (stream.status !== "live") throw new Error("Stream is not live");

    const { data: hostProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, stage_name")
      .eq("id", stream.host_id)
      .maybeSingle();
    const hostName =
      hostProfile?.stage_name || hostProfile?.display_name || "A BWF host";
    const link = `/stream/${stream.room_name}`;
    const streamUrl = `https://bwfmedia.company${link}`;

    // 2. Build recipient list: every profile except the host.
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .neq("id", stream.host_id);
    const userIds = (profiles ?? []).map((p) => p.id as string);
    if (userIds.length === 0) return { notified: 0, emailed: 0 };

    // 3. Load preferences for all recipients in one query.
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("user_id, in_app, email, push, live_alerts")
      .in("user_id", userIds);
    const prefMap = new Map<string, { in_app: boolean; email: boolean; push: boolean; live_alerts: boolean }>();
    (prefs ?? []).forEach((p: any) => prefMap.set(p.user_id, p));
    // default: all on
    const getPref = (id: string) => prefMap.get(id) ?? { in_app: true, email: true, push: true, live_alerts: true };

    // 4. Insert in-app notification rows in bulk.
    const inAppRecipients = userIds.filter((id) => {
      const p = getPref(id);
      return p.in_app && p.live_alerts;
    });
    let notified = 0;
    if (inAppRecipients.length > 0) {
      const rows = inAppRecipients.map((uid) => ({
        user_id: uid,
        type: "live_stream_started",
        title: `🔴 Live Now: ${hostName}`,
        body: stream.title,
        link,
        stream_id: stream.id,
        actor_id: stream.host_id,
      }));
      // chunked insert to be safe with large lists
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await supabaseAdmin.from("notifications").insert(chunk);
        if (!error) notified += chunk.length;
        else console.error("[broadcast] notifications insert failed", error);
      }
    }

    // 5. Email opt-ins — look up email addresses via auth admin, then enqueue.
    const emailRecipients = userIds.filter((id) => {
      const p = getPref(id);
      return p.email && p.live_alerts;
    });
    let emailed = 0;
    if (emailRecipients.length > 0) {
      // Render once per stream broadcast.
      const entry = TEMPLATES["live-stream-started"];
      const tplData = { hostName, streamTitle: stream.title, streamUrl };
      const html = await render(React.createElement(entry.component, tplData));
      const text = await render(React.createElement(entry.component, tplData), { plainText: true });
      const subject = typeof entry.subject === "function" ? entry.subject(tplData) : entry.subject;

      // Fetch emails via auth.admin in chunks of 1000.
      for (let i = 0; i < emailRecipients.length; i += 200) {
        const chunk = emailRecipients.slice(i, i + 200);
        const userLookups = await Promise.all(
          chunk.map(async (uid) => {
            const res = await supabaseAdmin.auth.admin.getUserById(uid);
            return { uid, email: res.data?.user?.email ?? null };
          }),
        );
        for (const { uid, email } of userLookups) {
          if (!email) continue;
          const lower = email.toLowerCase();
          const { data: suppressed } = await supabaseAdmin
            .from("suppressed_emails").select("email").eq("email", lower).maybeSingle();
          if (suppressed) continue;

          const messageId = `live-${stream.id}-${uid}`;
          const { error: claimErr } = await supabaseAdmin
            .from("email_send_log")
            .insert({
              message_id: messageId,
              template_name: "live-stream-started",
              recipient_email: email,
              status: "pending",
              metadata: { stream_id: stream.id, host_id: stream.host_id },
            });
          if (claimErr) continue; // duplicate or other; skip

          // unsubscribe token
          let unsubscribeToken: string | null = null;
          const { data: existing } = await supabaseAdmin
            .from("email_unsubscribe_tokens").select("token").eq("email", lower).maybeSingle();
          if (existing?.token) unsubscribeToken = existing.token;
          else {
            const t = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
            const { error: tokErr } = await supabaseAdmin
              .from("email_unsubscribe_tokens").insert({ email: lower, token: t });
            if (!tokErr) unsubscribeToken = t;
          }

          const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              to: email,
              from: FROM_ADDRESS,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text,
              purpose: "transactional",
              label: "live-stream-started",
              idempotency_key: messageId,
              unsubscribe_token: unsubscribeToken,
              message_id: messageId,
              queued_at: new Date().toISOString(),
            },
          });
          if (enqErr) {
            await supabaseAdmin.from("email_send_log").delete()
              .eq("message_id", messageId).eq("status", "pending");
            continue;
          }
          emailed += 1;
        }
      }
    }

    return { notified, emailed };
  });

/** Public list of currently live streams with host display info + viewer count. */
export const listLiveStreams = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ limit: z.number().int().min(1).max(50).default(20) }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data: streams, error } = await client
      .from("streams")
      .select("id, title, room_name, status, host_id, category, thumbnail_url, viewer_count, started_at, mode")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const hostIds = [...new Set((streams ?? []).map((s: any) => s.host_id))];
    let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; stage_name: string | null }>();
    if (hostIds.length) {
      const { data: profs } = await client
        .from("profiles")
        .select("id, display_name, avatar_url, stage_name")
        .in("id", hostIds);
      (profs ?? []).forEach((p: any) => profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url, stage_name: p.stage_name }));
    }
    return {
      streams: (streams ?? []).map((s: any) => ({
        ...s,
        host: profileMap.get(s.host_id) ?? null,
      })),
    };
  });