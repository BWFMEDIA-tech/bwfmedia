import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { allowedAssistantPath } from "./assistant";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

export const adminAssistantOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [a, u, f, usage] = await Promise.all([
      sb.from("assistant_articles").select("*").order("audience").order("title"),
      sb.from("assistant_unanswered").select("*").order("created_at", { ascending: false }).limit(50),
      sb.from("assistant_feedback").select("question, helpful, created_at").order("created_at", { ascending: false }).limit(200),
      sb.from("assistant_usage").select("*").order("day", { ascending: false }).limit(180),
    ]);
    return { articles: a.data ?? [], unanswered: u.data ?? [], feedback: f.data ?? [], usage: usage.data ?? [] };
  });

const ArticleSchema = z.object({
  id: z.string().uuid().nullable(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(120),
  audience: z.enum(["everyone", "fan", "artist", "host", "moderator", "admin"]),
  body: z.string().trim().min(2).max(4000),
  links: z.array(z.object({ label: z.string().trim().min(1).max(40), to: z.string() })).max(6),
  confirmed: z.boolean(),
  published: z.boolean(),
});

export const adminSaveArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ArticleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const links = data.links.map((l) => ({ label: l.label, to: allowedAssistantPath(l.to) })).filter((l) => l.to);
    const row = { slug: data.slug, title: data.title, audience: data.audience, body: data.body, links, confirmed: data.confirmed, published: data.published, updated_by: context.userId, updated_at: new Date().toISOString() };
    const res = data.id
      ? await context.supabase.from("assistant_articles").update(row).eq("id", data.id).select("id").single()
      : await context.supabase.from("assistant_articles").insert(row).select("id").single();
    if (res.error) throw new Error(res.error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit({ actorId: context.userId, action: data.id ? "assistant_article_update" : "assistant_article_create", targetType: "assistant_article", targetId: res.data.id, summary: data.title });
    return { id: res.data.id as string };
  });

export const adminDeleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("assistant_articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit({ actorId: context.userId, action: "assistant_article_delete", targetType: "assistant_article", targetId: data.id });
    return { ok: true };
  });
