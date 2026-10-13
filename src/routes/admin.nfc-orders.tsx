import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Nfc, Package, Truck, Clock } from "lucide-react";
import { toast } from "sonner";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { Button } from "@/components/ui/button";
import { adminListTagOrders, adminTagOrderEvents, adminUpdateTagOrder, adminSaveTagProduct } from "@/lib/nfc-admin.functions";
import { allowedFulfillment, tagOrderStatus, type OrderStatusLabel } from "@/lib/nfc-pages";
import { formatPrice } from "@/lib/artist-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/nfc-orders")({
  head: () => ({ meta: [{ title: "NFC Tag Orders — Admin" }, { name: "robots", content: "noindex" }] }),
  component: NfcOrdersAdmin,
});

const STATUSES: OrderStatusLabel[] = ["Pending Payment", "Paid", "Processing", "Shipped", "Delivered", "Cancelled", "Refunded"];
const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function NfcOrdersAdmin() {
  const auth = useAuth();
  const isAdmin = auth.roles.includes("admin");
  const list = useServerFn(adminListTagOrders);
  const q = useQuery({ queryKey: ["admin-nfc-orders"], queryFn: () => list(), enabled: isAdmin });
  const orders = (q.data?.orders ?? []) as any[];
  const names = (q.data?.names ?? {}) as Record<string, string>;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => orders.filter((o) => {
    const s = search.trim().toLowerCase();
    if (s && ![o.order_number, o.customer_email, names[o.buyer_user_id], o.shipping_address?.name].some((v) => String(v ?? "").toLowerCase().includes(s))) return false;
    if (status && tagOrderStatus(o) !== status) return false;
    if (from && o.created_at < from) return false;
    if (to && o.created_at.slice(0, 10) > to) return false;
    return true;
  }), [orders, names, search, status, from, to]);

  if (!isAdmin) return <SectionPage title="NFC Tag Orders" subtitle="Admins only."><EmptyState icon={Nfc} title="Admins only" hint="Sign in with an admin account." /></SectionPage>;
  const count = (l: OrderStatusLabel) => String(orders.filter((o) => tagOrderStatus(o) === l).length);

  return (
    <SectionPage title="NFC Tag Orders" subtitle="Fulfil artist tag orders. Payment status comes only from verified payment events; every change is logged."
      stats={[
        { label: "Awaiting fulfilment", value: count("Paid"), icon: Clock, color: "#00E6FF" },
        { label: "Processing", value: count("Processing"), icon: Package, color: "#004BFF" },
        { label: "Shipped", value: count("Shipped"), icon: Truck, color: "#22c55e" },
      ]}>
      <div className="space-y-6">
        <Pricing products={(q.data?.products ?? []) as any[]} />
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <input className={input} placeholder="Order #, customer, email" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
          {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !rows.length ? <EmptyState icon={Nfc} title={orders.length ? "No matching orders" : "No tag orders yet"} hint="Orders appear here once artists check out." /> : (
            <div className="divide-y divide-border text-sm">{rows.map((o) => (
              <div key={o.id} className="py-3">
                <button className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
                  <div><div className="font-semibold">{o.order_number} · {o.quantity} × {o.product_name}</div><div className="text-xs text-muted-foreground">{names[o.buyer_user_id] || o.customer_email || "Customer"} · {new Date(o.created_at).toLocaleString()}</div></div>
                  <div className="text-right"><div>{formatPrice(o.amount_total_cents ?? o.unit_price_cents * o.quantity, o.currency)}</div><div className="text-xs font-bold uppercase text-primary">{tagOrderStatus(o)}</div></div>
                </button>
                {openId === o.id && <OrderDetail o={o} />}
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </SectionPage>
  );
}

function OrderDetail({ o }: { o: any }) {
  const qc = useQueryClient();
  const update = useServerFn(adminUpdateTagOrder);
  const events = useServerFn(adminTagOrderEvents);
  const ev = useQuery({ queryKey: ["admin-nfc-order-events", o.id], queryFn: () => events({ data: { orderId: o.id } }) });
  const [carrier, setCarrier] = useState(o.carrier ?? "");
  const [tracking, setTracking] = useState(o.tracking_number ?? "");
  const [busy, setBusy] = useState(false);
  const addr = o.shipping_address?.address;
  const run = async (d: any) => {
    setBusy(true);
    try {
      const r = await update({ data: { orderId: o.id, ...d } });
      if (r.error) toast.error(r.error); else { toast.success("Saved and logged"); qc.invalidateQueries({ queryKey: ["admin-nfc-orders"] }); qc.invalidateQueries({ queryKey: ["admin-nfc-order-events", o.id] }); }
    } finally { setBusy(false); }
  };
  const next = allowedFulfillment(o.status, o.fulfillment_status);
  return (
    <div className="mt-3 grid gap-4 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
      <div className="space-y-1 text-xs">
        <p><span className="text-muted-foreground">Payment:</span> {o.status}{o.paid_at ? ` · ${new Date(o.paid_at).toLocaleString()}` : ""} ({o.environment})</p>
        <p><span className="text-muted-foreground">Fulfilment:</span> {o.fulfillment_status}</p>
        <p><span className="text-muted-foreground">Unit price:</span> {formatPrice(o.unit_price_cents, o.currency)} · shipping {formatPrice(o.shipping_cents ?? 0, o.currency)}</p>
        <p><span className="text-muted-foreground">Email:</span> {o.customer_email ?? "—"}</p>
        <p className="text-muted-foreground">Ship to:</p>
        {addr ? <p>{o.shipping_address.name}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}, {addr.state} {addr.postal_code}<br />{addr.country}</p> : <p>Collected after payment.</p>}
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          <input className={input} placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" disabled={busy || o.status !== "paid"} onClick={() => run({ carrier, tracking })}>Save tracking</Button>
        <div className="flex flex-wrap gap-2">
          {next.length ? next.map((n) => <Button key={n} size="sm" disabled={busy} variant={n === "cancelled" ? "destructive" : "default"} onClick={() => { if (n !== "cancelled" || confirm("Cancel fulfilment? This does not refund the payment.")) run({ fulfillment: n, ...(n === "shipped" ? { carrier, tracking } : {}) }); }}>Mark {n}</Button>)
            : <p className="text-xs text-muted-foreground">{o.status === "paid" ? "No further fulfilment steps." : "Fulfilment unlocks after verified payment."}</p>}
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">History</p>
          {(ev.data?.events ?? []).length ? (ev.data!.events as any[]).map((e) => <p key={e.id} className="text-xs">{new Date(e.created_at).toLocaleString()} · {e.field}: {e.from_value || "—"} → {e.to_value || "—"} · {e.actor_id ? "admin" : "payment system"}</p>) : <p className="text-xs text-muted-foreground">No changes yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Pricing({ products }: { products: any[] }) {
  const [editing, setEditing] = useState<any | null>(null);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Tag pricing</h2><Button size="sm" onClick={() => setEditing({ id: null, name: "", tag_type: "", description: "", price_cents: 0, shipping_cents: 0, min_quantity: 1, currency: "usd", active: false })}>Add tag type</Button></div>
      <p className="mb-3 text-xs text-muted-foreground">Ordering stays closed for a tag until it has a price and is switched on.</p>
      {!products.length && !editing && <p className="text-sm text-muted-foreground">No tag types yet — artists see "Pricing coming soon".</p>}
      <div className="divide-y divide-border text-sm">{products.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <div><span className="font-semibold">{p.name}</span> <span className="text-xs text-muted-foreground">({p.tag_type})</span><div className="text-xs text-muted-foreground">{formatPrice(p.price_cents, p.currency)} each · shipping {formatPrice(p.shipping_cents ?? 0, p.currency)} · min {p.min_quantity} · {p.active ? "On sale" : "Off"}</div></div>
          <Button size="sm" variant="outline" onClick={() => setEditing({ ...p, description: p.description ?? "" })}>Edit</Button>
        </div>
      ))}</div>
      {editing && <ProductForm p={editing} onDone={() => setEditing(null)} />}
    </div>
  );
}

function ProductForm({ p, onDone }: { p: any; onDone: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveTagProduct);
  const [f, setF] = useState({ ...p, price: (p.price_cents / 100).toFixed(2), ship: ((p.shipping_cents ?? 0) / 100).toFixed(2) });
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const submit = async () => {
    const r = await save({ data: { id: f.id, name: f.name, tag_type: f.tag_type, description: f.description || null, price_cents: Math.round(Number(f.price) * 100), shipping_cents: Math.round(Number(f.ship) * 100), min_quantity: Number(f.min_quantity), currency: "usd", active: f.active } });
    if (r.error) return toast.error(r.error);
    toast.success("Pricing saved and logged"); qc.invalidateQueries({ queryKey: ["admin-nfc-orders"] }); onDone();
  };
  return (
    <div className="mt-4 grid gap-2 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
      <input className={input} placeholder="Name" value={f.name} onChange={(e) => set("name", e.target.value)} />
      <input className={input} placeholder="Tag type (e.g. keychain, sticker)" value={f.tag_type} onChange={(e) => set("tag_type", e.target.value)} />
      <label className="text-xs text-muted-foreground">Unit price (USD)<input type="number" step="0.01" min="0" className={input} value={f.price} onChange={(e) => set("price", e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Shipping per order (USD)<input type="number" step="0.01" min="0" className={input} value={f.ship} onChange={(e) => set("ship", e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Minimum quantity<input type="number" min="1" max="1000" className={input} value={f.min_quantity} onChange={(e) => set("min_quantity", e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Open for ordering</label>
      <textarea className={`${input} sm:col-span-2`} placeholder="Description" value={f.description} onChange={(e) => set("description", e.target.value)} />
      <div className="flex gap-2 sm:col-span-2"><Button size="sm" onClick={submit}>Save</Button><Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
    </div>
  );
}
