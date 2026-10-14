import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShoppingBag, ClipboardCheck, DollarSign, Truck } from "lucide-react";
import { toast } from "sonner";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { Button } from "@/components/ui/button";
import { adminStoreOverview, adminReviewProduct, adminSaveShippingRule } from "@/lib/store-admin.functions";
import {
  CATEGORY_LABELS, PRODUCT_TYPE_LABELS, REVIEW_STATUSES, SHIPPING_REGIONS, STORE_CATEGORIES, SUGGESTED_PRICE_CENTS,
  categoryOf, computeSplit, formatPrice, type ProductType, type ReviewStatus, type StoreMerchCategory, type ShippingRegion,
} from "@/lib/artist-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/merchandise")({
  head: () => ({ meta: [{ title: "Merchandise — Admin" }, { name: "robots", content: "noindex" }] }),
  component: MerchAdmin,
});

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const toCents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));
const dollars = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));
type Tab = "products" | "shipping" | "split" | "orders" | "log";

function MerchAdmin() {
  const auth = useAuth();
  const isAdmin = auth.roles.includes("admin");
  const fn = useServerFn(adminStoreOverview);
  const q = useQuery({ queryKey: ["admin-merch-store"], queryFn: () => fn(), enabled: isAdmin });
  const [tab, setTab] = useState<Tab>("products");
  if (!isAdmin) return <SectionPage title="Merchandise" subtitle="Admins only."><EmptyState icon={ShoppingBag} title="Admins only" hint="Sign in with an admin account." /></SectionPage>;
  const d: any = q.data ?? { products: [], variants: [], rules: [], orders: [], ledger: [], log: [], names: {}, artistBps: 6000 };
  const pending = d.products.filter((p: any) => p.review_status === "pending").length;
  const live = d.ledger.filter((l: any) => l.environment === "live");
  const platform = live.reduce((s: number, l: any) => s + l.platform_cents, 0);
  const artist = live.reduce((s: number, l: any) => s + l.artist_cents, 0);
  return (
    <SectionPage title="Merchandise" subtitle="Review artist products, set real costs and shipping. Nothing sells until approved here; every change is logged."
      stats={[
        { label: "Waiting for review", value: String(pending), icon: ClipboardCheck, color: "#00E6FF" },
        { label: "Artist earnings (live)", value: formatPrice(artist), icon: DollarSign, color: "#004BFF" },
      ]}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["products", "shipping", "orders", "log"] as Tab[]).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="capitalize">{t === "log" ? "Change log" : t}</Button>
        ))}
      </div>
      {tab === "products" && <Products d={d} />}
      {tab === "shipping" && <Shipping rules={d.rules} />}
      {tab === "orders" && <Orders d={d} />}
      {tab === "log" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          {d.log.length ? d.log.map((l: any) => (
            <div key={l.id} className="border-b border-border/60 py-2 text-sm last:border-0">
              <div className="font-medium">{l.summary}</div>
              <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()} · {l.actor_email ?? "admin"} · {l.action}</div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No store changes yet.</p>}
        </div>
      )}
    </SectionPage>
  );
}

function Products({ d }: { d: any }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("pending");
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => d.products.filter((p: any) => {
    const s = search.trim().toLowerCase();
    if (s && ![p.title, d.names[p.user_id]].some((v) => String(v ?? "").toLowerCase().includes(s))) return false;
    if (cat && categoryOf(p.product_type) !== cat) return false;
    if (status && p.review_status !== status) return false;
    return true;
  }), [d, search, cat, status]);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <input className={input} placeholder="Product or artist" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={input} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{STORE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select>
        <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any review status</option>{REVIEW_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</select>
      </div>
      {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No products match.</p>}
      {rows.map((p: any) => (
        <div key={p.id} className="border-b border-border/60 py-3 last:border-0">
          <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.title}</div>
              <div className="text-xs text-muted-foreground">{d.names[p.user_id] || "Artist"} · {PRODUCT_TYPE_LABELS[p.product_type as ProductType] ?? p.product_type} · {formatPrice(p.price_cents)} · cost {p.cost_cents == null ? "not set" : formatPrice(p.cost_cents)}</div>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">{p.review_status}</span>
          </button>
          {open === p.id && <ReviewForm p={p} variants={d.variants.filter((v: any) => v.product_id === p.id)} bps={d.artistBps} />}
        </div>
      ))}
    </div>
  );
}

function ReviewForm({ p, variants, bps }: { p: any; variants: any[]; bps: number }) {
  const qc = useQueryClient();
  const save = useServerFn(adminReviewProduct);
  const suggested = SUGGESTED_PRICE_CENTS[p.product_type as ProductType];
  const [price, setPrice] = useState(dollars(p.price_cents));
  const [cost, setCost] = useState(dollars(p.cost_cents));
  const [minQ, setMinQ] = useState(String(p.min_quantity ?? 1));
  const [inv, setInv] = useState(String(p.inventory ?? 0));
  const [mto, setMto] = useState(!!p.made_to_order);
  const [vs, setVs] = useState(variants.map((v) => ({ id: v.id, label: v.label, price: dollars(v.price_cents), cost: dollars(v.cost_cents) })));
  const [busy, setBusy] = useState(false);
  const est = toCents(price) != null && toCents(cost) != null ? computeSplit({ revenue_cents: toCents(price)!, cost_cents: toCents(cost)!, fee_cents: Math.round(toCents(price)! * 0.029 + 30), artist_bps: bps }) : null;
  async function submit(review_status: ReviewStatus, archive = false) {
    setBusy(true);
    try {
      const r = await save({ data: {
        productId: p.id, price_cents: toCents(price) ?? 0, cost_cents: toCents(cost), min_quantity: Math.max(1, parseInt(minQ) || 1),
        inventory: Math.max(0, parseInt(inv) || 0), made_to_order: mto, review_status, archive,
        variantCosts: vs.map((v) => ({ id: v.id, price_cents: toCents(v.price) ?? 0, cost_cents: toCents(v.cost) })),
      } });
      if (r.error) toast.error(r.error); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-merch-store"] }); }
    } finally { setBusy(false); }
  }
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-background/60 p-3">
      <div className="grid gap-2 sm:grid-cols-5">
        <label className="text-xs text-muted-foreground">Selling price ($)<input className={input} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />{suggested && <span className="text-[11px]">Suggested {formatPrice(suggested)}</span>}</label>
        <label className="text-xs text-muted-foreground">Actual cost ($)<input className={input} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Required" /></label>
        <label className="text-xs text-muted-foreground">Min. quantity<input className={input} inputMode="numeric" value={minQ} onChange={(e) => setMinQ(e.target.value)} /></label>
        <label className="text-xs text-muted-foreground">Stock<input className={input} inputMode="numeric" value={inv} onChange={(e) => setInv(e.target.value)} /></label>
        <label className="flex items-end gap-2 pb-2 text-xs"><input type="checkbox" checked={mto} onChange={(e) => setMto(e.target.checked)} /> Made to order</label>
      </div>
      {vs.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold">Options</div>
          {vs.map((v, i) => (
            <div key={v.id} className="grid grid-cols-3 gap-2 text-xs">
              <span className="self-center">{v.label}</span>
              <input className={input} value={v.price} aria-label={`${v.label} price`} onChange={(e) => setVs(vs.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              <input className={input} value={v.cost} placeholder="Cost (uses product cost)" aria-label={`${v.label} cost`} onChange={(e) => setVs(vs.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} />
            </div>
          ))}
        </div>
      )}
      {est && <p className="text-xs text-muted-foreground">Estimate per item (fee estimated at 2.9% + 30¢): profit {formatPrice(est.profit_cents)} · artist {formatPrice(est.artist_cents)} · Tunevio {formatPrice(est.platform_cents)}. Final amounts use the real payment fee.</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => submit("approved")}>Approve for sale</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => submit("pending")}>Save, keep in review</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => submit("disabled")}>Disable</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => submit("disabled", true)}>Archive</Button>
      </div>
    </div>
  );
}

function Shipping({ rules }: { rules: any[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-xs text-muted-foreground">One charge per order: first item plus each additional item. Shipping is never counted as profit. A category with no active rule can't be sold.</p>
      <div className="space-y-3">
        {STORE_CATEGORIES.flatMap((c) => SHIPPING_REGIONS.map((r) => <RuleRow key={`${c}-${r}`} category={c} region={r} rule={rules.find((x) => x.category === c && x.region === r)} />))}
      </div>
    </div>
  );
}

function RuleRow({ category, region, rule }: { category: StoreMerchCategory; region: ShippingRegion; rule?: any }) {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveShippingRule);
  const [first, setFirst] = useState(dollars(rule?.first_item_cents));
  const [add, setAdd] = useState(dollars(rule?.additional_item_cents ?? 0));
  const [active, setActive] = useState(rule?.active ?? true);
  return (
    <div className="grid items-end gap-2 sm:grid-cols-5">
      <div className="text-sm"><div className="font-medium">{CATEGORY_LABELS[category]}</div><div className="text-xs capitalize text-muted-foreground">{region === "domestic" ? "U.S." : "International"}{rule ? "" : " · not set"}</div></div>
      <label className="text-xs text-muted-foreground">First item ($)<input className={input} value={first} onChange={(e) => setFirst(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Each extra ($)<input className={input} value={add} onChange={(e) => setAdd(e.target.value)} /></label>
      <label className="flex items-center gap-2 pb-2 text-xs"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
      <Button size="sm" variant="outline" onClick={async () => {
        const f = toCents(first); if (f == null) return toast.error("Enter the first-item charge");
        const r = await save({ data: { category, region, first_item_cents: f, additional_item_cents: toCents(add) ?? 0, active } });
        if (r.error) toast.error(r.error); else { toast.success("Shipping saved"); qc.invalidateQueries({ queryKey: ["admin-merch-store"] }); }
      }}>Save</Button>
    </div>
  );
}

function Split({ bps }: { bps: number }) {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveSplit);
  const [pct, setPct] = useState(String(bps / 100));
  return (
    <div className="max-w-md rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm text-muted-foreground">Share of net merchandise profit (after cost and payment fee, excluding tax and shipping). Applies to sales confirmed after the change; past sales keep their recorded split.</p>
      <label className="text-xs text-muted-foreground">Artist share (%)<input className={input} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></label>
      <p className="mt-2 text-xs">Tunevio share: {Math.max(0, 100 - Number(pct || 0)).toFixed(2)}%</p>
      <Button className="mt-3" size="sm" onClick={async () => {
        const v = Math.round(Number(pct) * 100);
        if (!Number.isFinite(v) || v < 0 || v > 10000) return toast.error("Enter 0–100");
        const r = await save({ data: { artist_bps: v } });
        if (r.error) toast.error(r.error); else { toast.success("Split saved"); qc.invalidateQueries({ queryKey: ["admin-merch-store"] }); }
      }}>Save split</Button>
    </div>
  );
}

function Orders({ d }: { d: any }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const byOrder = useMemo(() => {
    const m: Record<string, { artist: number; platform: number }> = {};
    for (const l of d.ledger) { m[l.order_id] ??= { artist: 0, platform: 0 }; m[l.order_id].artist += l.artist_cents; m[l.order_id].platform += l.platform_cents; }
    return m;
  }, [d.ledger]);
  const rows = d.orders.filter((o: any) => {
    const s = search.trim().toLowerCase();
    if (s && ![o.id, o.product_title, o.buyer_email, d.names[o.seller_user_id]].some((v) => String(v ?? "").toLowerCase().includes(s))) return false;
    if (status && o.status !== status && o.fulfillment_status !== status) return false;
    return true;
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Order, product, artist, customer email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{["pending", "paid", "refunded", "failed", "expired", "processing", "shipped", "delivered"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>}
      {rows.map((o: any) => (
        <div key={o.id} className="grid gap-1 border-b border-border/60 py-2 text-sm last:border-0 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="truncate font-medium">{o.product_title}{o.variant_label ? ` — ${o.variant_label}` : ""} ×{o.quantity}</div>
            <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {d.names[o.seller_user_id] || "Artist"} · {o.buyer_email ?? "—"} · {new Date(o.created_at).toLocaleDateString()} · {o.environment === "live" ? "live" : "test"}</div>
            <div className="text-xs text-muted-foreground">{o.status} · {o.fulfillment_status}{o.tracking_number ? ` · ${o.carrier ?? ""} ${o.tracking_number}` : ""}</div>
          </div>
          <div className="text-right text-xs">
            <div className="font-semibold">{formatPrice(o.amount_total_cents ?? o.unit_price_cents * o.quantity, o.currency)}</div>
            <div className="text-muted-foreground">shipping {formatPrice(o.shipping_cents ?? 0)} · fee {o.fee_cents == null ? "—" : formatPrice(o.fee_cents)}</div>
            {byOrder[o.id] && <div>artist {formatPrice(byOrder[o.id].artist)} · Tunevio {formatPrice(byOrder[o.id].platform)}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
