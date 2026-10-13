import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { allowedFulfillment, checkTagPricing } from "@/lib/nfc-pages";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

export const adminListTagOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [{ data: orders }, { data: products }] = await Promise.all([
      sb.from("nfc_tag_orders").select("*").order("created_at", { ascending: false }).limit(500),
      sb.from("nfc_tag_products").select("*").order("created_at"),
    ]);
    const ids = [...new Set((orders ?? []).map((o: any) => o.buyer_user_id))];
    const { data: profs } = ids.length ? await sb.from("profiles").select("id, display_name, username").in("id", ids) : { data: [] };
    const names: Record<string, string> = {};
    for (const p of profs ?? []) names[p.id] = p.display_name || p.username || "";
    return { orders: orders ?? [], products: products ?? [], names };
  });

export const adminTagOrderEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: ev } = await (context.supabase as any).from("nfc_tag_order_events").select("*").eq("order_id", data.orderId).order("created_at");
    return { events: ev ?? [] };
  });

export const adminUpdateTagOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderId: z.string().uuid(),
    fulfillment: z.enum(["unfulfilled", "processing", "shipped", "delivered", "cancelled"]).optional(),
    carrier: z.string().trim().max(60).nullable().optional(),
    tracking: z.string().trim().max(100).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const { data: o } = await sb.from("nfc_tag_orders").select("id, status, fulfillment_status, buyer_user_id, order_number").eq("id", data.orderId).maybeSingle();
    if (!o) return { error: "Order not found" };
    const patch: Record<string, unknown> = {};
    if (data.fulfillment && data.fulfillment !== o.fulfillment_status) {
      if (!allowedFulfillment(o.status, o.fulfillment_status).includes(data.fulfillment)) return { error: `Can't move a ${o.status} order from ${o.fulfillment_status} to ${data.fulfillment}.` };
      patch.fulfillment_status = data.fulfillment;
    }
    if (data.carrier !== undefined) patch.carrier = data.carrier || null;
    if (data.tracking !== undefined) patch.tracking_number = data.tracking || null;
    if (!Object.keys(patch).length) return { error: null };
    // Update as the admin so the change log records who did it.
    const { error } = await sb.from("nfc_tag_orders").update(patch).eq("id", o.id);
    if (error) return { error: error.message };
    const { logAudit } = await import("@/lib/audit.server");
    await logAudit({ actorId: context.userId, action: "nfc_tag_order.update", targetType: "nfc_tag_order", targetId: o.id, summary: `Updated ${o.order_number}`, metadata: patch });
    if (patch.fulfillment_status === "shipped") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).from("notifications").insert({
        user_id: o.buyer_user_id, type: "nfc_order_shipped", title: `Your NFC tags shipped (${o.order_number})`,
        body: data.tracking ? `Tracking: ${[data.carrier, data.tracking].filter(Boolean).join(" ")}` : "Your order is on its way.",
        link: "/artist-store/tags", actor_id: context.userId,
      });
    }
    return { error: null };
  });

export const adminSaveTagProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().nullable(),
    name: z.string().trim().min(1).max(80),
    tag_type: z.string().trim().min(1).max(40),
    description: z.string().trim().max(300).nullable(),
    price_cents: z.number().int(),
    shipping_cents: z.number().int(),
    min_quantity: z.number().int(),
    currency: z.enum(["usd"]),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const problem = checkTagPricing(data);
    if (problem) return { error: problem };
    const { id, ...row } = data;
    const sb = context.supabase as any;
    const q = id ? sb.from("nfc_tag_products").update({ ...row, updated_at: new Date().toISOString() }).eq("id", id) : sb.from("nfc_tag_products").insert(row);
    const { error } = await q;
    if (error) return { error: error.message };
    const { logAudit } = await import("@/lib/audit.server");
    await logAudit({ actorId: context.userId, action: id ? "nfc_tag_product.update" : "nfc_tag_product.create", targetType: "nfc_tag_product", targetId: id, summary: `${row.name}: ${row.price_cents}c, ship ${row.shipping_cents}c, min ${row.min_quantity}, ${row.active ? "on" : "off"}` });
    return { error: null };
  });
