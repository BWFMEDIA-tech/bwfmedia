import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Eye, Nfc, Upload, X, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  getMyStore, saveStoreProduct, deleteStoreProduct, saveNfcLink, confirmNfcProgrammed, updateOrderFulfillment, refundStoreOrder,
} from "@/lib/artist-store.functions";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, FULFILLMENT_STATUSES, formatPrice, isNfcType, isSafeNfcPath, type ProductType } from "@/lib/artist-store";

export const Route = createFileRoute("/artist-store/manage")({
  head: () => ({
    meta: [
      { title: "Manage Artist Store — Tunevio" },
      { name: "description", content: "Create physical products, set NFC destinations and fulfil orders for your Tunevio artist store." },
      { property: "og:title", content: "Manage Artist Store — Tunevio" },
      { property: "og:description", content: "Create physical products, set NFC destinations and fulfil orders for your Tunevio artist store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManagePage,
});

type Draft = {
  id?: string; title: string; description: string; product_type: ProductType; price: string; inventory: string;
  shipping_info: string; image_urls: string[]; previews: string[]; release_id: string | null; status: "draft" | "published" | "archived"; is_featured: boolean;
};
const EMPTY: Draft = { title: "", description: "", product_type: "vinyl", price: "", inventory: "0", shipping_info: "", image_urls: [], previews: [], release_id: null, status: "draft", is_featured: false };

function ManagePage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const fetchStore = useServerFn(getMyStore);
  const { data, isLoading } = useQuery({ queryKey: ["my-artist-store"], queryFn: () => fetchStore(), enabled: !!user });
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [draft, setDraft] = useState<Draft | null>(null);
  const del = useServerFn(deleteStoreProduct);

  if (loading) return <Center />;
  if (!user) return <main className="mx-auto max-w-md px-4 py-20 text-center"><p className="text-sm text-muted-foreground">Sign in to manage your store.</p><Link to="/login" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link></main>;
  if (isLoading || !data) return <Center />;

  const orders = data.isAdmin ? data.allOrders : data.orders;
  const paid = data.orders.filter((o: any) => o.status === "paid");
  const sales = paid.reduce((s: number, o: any) => s + (o.amount_total_cents ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Artist Store</h1>
          <p className="text-sm text-muted-foreground">Sell vinyl, CDs, cassettes, NFC keychains and merch.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/artist/$id" params={{ id: user.id }} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm"><Eye className="h-4 w-4" /> Preview storefront</Link>
          <button onClick={() => { setTab("products"); setDraft({ ...EMPTY }); }} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /> New product</button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Products" value={String(data.products.length)} />
        <Stat label="Paid orders" value={String(paid.length)} />
        <Stat label="Sales" value={formatPrice(sales)} />
      </div>

      <div className="mt-5 flex gap-2 border-b border-border">
        {(["products", "orders"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold capitalize ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            {t}{t === "orders" && data.isAdmin ? " (all — admin)" : ""}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <>
          {draft && <ProductEditor draft={draft} setDraft={setDraft} releases={data.releases} userId={user.id} nfcLink={data.nfcLinks.find((l: any) => l.product_id === draft.id)} onSaved={() => qc.invalidateQueries({ queryKey: ["my-artist-store"] })} />}
          {data.products.length === 0 && !draft ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No products yet. Tap <strong>New product</strong> to add your first physical release.</div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.products.map((p: any) => (
                <li key={p.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">{p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{PRODUCT_TYPE_LABELS[p.product_type as ProductType]} · {formatPrice(p.price_cents)} · {p.inventory} left</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${p.status === "published" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                    <div className="mt-2 flex gap-1">
                      <button aria-label="Edit" onClick={() => setDraft({ id: p.id, title: p.title, description: p.description ?? "", product_type: p.product_type, price: (p.price_cents / 100).toFixed(2), inventory: String(p.inventory), shipping_info: p.shipping_info ?? "", image_urls: p.image_urls ?? [], previews: p.images, release_id: p.release_id, status: p.status, is_featured: p.is_featured })} className="rounded-lg border border-border p-1.5"><Pencil className="h-3.5 w-3.5" /></button>
                      <button aria-label="Delete" onClick={async () => { if (!confirm("Delete this product?")) return; try { await del({ data: { id: p.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["my-artist-store"] }); } catch (e: any) { toast.error(e.message); } }} className="rounded-lg border border-border p-1.5"><Trash2 className="h-3.5 w-3.5" /></button>
                      {p.status === "published" && <Link to="/artist-store/$productId" params={{ productId: p.id }} className="rounded-lg border border-border p-1.5"><ExternalLink className="h-3.5 w-3.5" /></Link>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "orders" && <OrdersTable orders={orders} onChanged={() => qc.invalidateQueries({ queryKey: ["my-artist-store"] })} />}
    </main>
  );
}

function Center() { return <div className="grid h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>; }
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>;
}
const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function ProductEditor({ draft, setDraft, releases, userId, nfcLink, onSaved }: { draft: Draft; setDraft: (d: Draft | null) => void; releases: any[]; userId: string; nfcLink?: any; onSaved: () => void }) {
  const save = useServerFn(saveStoreProduct);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const m = useMutation({
    mutationFn: () => save({ data: {
      id: draft.id, title: draft.title, description: draft.description, product_type: draft.product_type,
      price_cents: Math.round(Number(draft.price || 0) * 100), inventory: Math.max(0, parseInt(draft.inventory || "0", 10) || 0),
      shipping_info: draft.shipping_info, image_urls: draft.image_urls, release_id: draft.release_id, status: draft.status, is_featured: draft.is_featured,
    } }),
    onSuccess: (r) => { toast.success("Product saved"); setDraft({ ...draft, id: r.id }); onSaved(); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const paths = [...draft.image_urls]; const previews = [...draft.previews];
      for (const f of Array.from(files).slice(0, 8 - paths.length)) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast.error(`${f.name}: use JPG, PNG or WebP`); continue; }
        if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name}: max 5 MB`); continue; }
        const path = `${userId}/${crypto.randomUUID()}.${f.type.split("/")[1]}`;
        const { error } = await supabase.storage.from("store-products").upload(path, f, { contentType: f.type });
        if (error) { toast.error(error.message); continue; }
        paths.push(path); previews.push(URL.createObjectURL(f));
      }
      set({ image_urls: paths, previews });
    } finally { setUploading(false); }
  }

  return (
    <section className="mt-4 rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{draft.id ? "Edit product" : "New product"}</h2><button aria-label="Close" onClick={() => setDraft(null)}><X className="h-4 w-4" /></button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 text-xs text-muted-foreground">Title<input className={field} value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} /></label>
        <label className="text-xs text-muted-foreground">Type
          <select className={field} value={draft.product_type} onChange={(e) => set({ product_type: e.target.value as ProductType })}>
            {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Linked release
          <select className={field} value={draft.release_id ?? ""} onChange={(e) => set({ release_id: e.target.value || null })}>
            <option value="">None</option>
            {releases.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Price (USD)<input className={field} inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="25.00" /></label>
        <label className="text-xs text-muted-foreground">Inventory<input className={field} inputMode="numeric" value={draft.inventory} onChange={(e) => set({ inventory: e.target.value.replace(/\D/g, "") })} /></label>
        <label className="sm:col-span-2 text-xs text-muted-foreground">Description<textarea className={field} rows={3} value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={4000} /></label>
        <label className="sm:col-span-2 text-xs text-muted-foreground">Shipping details<textarea className={field} rows={2} value={draft.shipping_info} onChange={(e) => set({ shipping_info: e.target.value })} placeholder="Ships in 3–5 business days from …" maxLength={2000} /></label>
        <div className="sm:col-span-2">
          <div className="text-xs text-muted-foreground">Images (up to 8)</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {draft.previews.map((u, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button aria-label="Remove image" onClick={() => set({ image_urls: draft.image_urls.filter((_, j) => j !== i), previews: draft.previews.filter((_, j) => j !== i) })} className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border border-dashed border-border text-muted-foreground">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
            </label>
          </div>
        </div>
        <label className="text-xs text-muted-foreground">Visibility
          <select className={field} value={draft.status} onChange={(e) => set({ status: e.target.value as Draft["status"] })}>
            <option value="draft">Draft (hidden)</option><option value="published">Published</option><option value="archived">Archived</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={draft.is_featured} onChange={(e) => set({ is_featured: e.target.checked })} /> Feature in store</label>
      </div>
      <button disabled={m.isPending || !draft.title} onClick={() => m.mutate()} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-6">
        {m.isPending ? "Saving…" : "Save product"}
      </button>
      {isNfcType(draft.product_type) && (draft.id ? <NfcPanel productId={draft.id} userId={userId} link={nfcLink} releases={releases} onSaved={onSaved} /> : <p className="mt-4 text-xs text-muted-foreground">Save the product first to set up its NFC tag.</p>)}
    </section>
  );
}

function NfcPanel({ productId, userId, link, releases, onSaved }: { productId: string; userId: string; link?: any; releases: any[]; onSaved: () => void }) {
  const saveLink = useServerFn(saveNfcLink);
  const confirmFn = useServerFn(confirmNfcProgrammed);
  const [type, setType] = useState<"profile" | "release" | "page">(link?.destination_type ?? "profile");
  const [release, setRelease] = useState<string>(releases[0]?.id ?? "");
  const [page, setPage] = useState<string>(link?.destination_type === "page" ? link.destination_path : "/");
  const dest = type === "profile" ? `/artist/${userId}` : type === "release" ? `/artist/${userId}?release=${release}` : page;
  const tagUrl = link ? `${typeof window !== "undefined" ? window.location.origin : "https://tunevio.com"}/nfc/${link.code}` : null;

  async function save() {
    if (!isSafeNfcPath(dest)) return toast.error("Use a Tunevio page path, like /artist/…");
    try { await saveLink({ data: { productId, destination_type: type, destination_path: dest } }); toast.success("NFC destination saved"); onSaved(); }
    catch (e: any) { toast.error(e.message); }
  }
  return (
    <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4">
      <h3 className="flex items-center gap-2 font-semibold"><Nfc className="h-4 w-4 text-primary" /> NFC tag</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Opens
          <select className={field} value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="profile">My artist profile</option><option value="release">A release</option><option value="page">Another Tunevio page</option>
          </select>
        </label>
        {type === "release" && <label className="text-xs text-muted-foreground">Release<select className={field} value={release} onChange={(e) => setRelease(e.target.value)}>{releases.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>}
        {type === "page" && <label className="text-xs text-muted-foreground">Page path<input className={field} value={page} onChange={(e) => setPage(e.target.value)} placeholder="/charts" /></label>}
      </div>
      <button onClick={save} className="mt-3 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary">Save destination</button>

      {link && tagUrl && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
            <code className="min-w-0 flex-1 truncate text-xs">{tagUrl}</code>
            <button aria-label="Copy" onClick={() => { navigator.clipboard.writeText(tagUrl); toast.success("Copied"); }} className="p-1"><Copy className="h-4 w-4" /></button>
            <a href={tagUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">Test</a>
          </div>
          <div className="text-xs text-muted-foreground">Currently opens: <span className="text-foreground">{link.destination_path}</span> · Scans: {link.scan_count}</div>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Install a tag writer app such as NFC Tools (iPhone or Android).</li>
            <li>Choose Write → Add a record → URL, and paste the link above.</li>
            <li>Hold the phone to the tag until it confirms the write.</li>
            <li>Scan the tag with a different phone and check it opens the right page.</li>
            <li>Optional: lock the tag. The link above never changes, so you can change the destination here anytime.</li>
          </ol>
          {link.programmed_confirmed_at ? (
            <div className="flex items-center gap-2 text-xs text-primary"><CheckCircle2 className="h-4 w-4" /> You confirmed a working test scan on {new Date(link.programmed_confirmed_at).toLocaleDateString()}. <button className="underline" onClick={async () => { await confirmFn({ data: { productId, confirmed: false } }); onSaved(); }}>Undo</button></div>
          ) : (
            <button onClick={async () => { await confirmFn({ data: { productId, confirmed: true } }); toast.success("Marked as tested"); onSaved(); }} className="rounded-xl border border-border px-3 py-1.5 text-xs">I scanned a tag and it opened the right page</button>
          )}
          <p className="text-[11px] text-muted-foreground">Tunevio doesn't program tags for you — status only changes when you confirm a successful test.</p>
        </div>
      )}
    </div>
  );
}

function OrdersTable({ orders, onChanged }: { orders: any[]; onChanged: () => void }) {
  const update = useServerFn(updateOrderFulfillment);
  const refund = useServerFn(refundStoreOrder);
  if (!orders.length) return <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No orders yet.</div>;
  return (
    <ul className="mt-4 space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold">{o.product_title} × {o.quantity}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.buyer_email ?? "—"} {o.environment === "sandbox" && "· test"}</div>
              {o.shipping_address && <div className="mt-1 text-xs text-muted-foreground">Ship to: {[o.shipping_address.name, o.shipping_address.address?.line1, o.shipping_address.address?.city, o.shipping_address.address?.postal_code, o.shipping_address.address?.country].filter(Boolean).join(", ")}</div>}
            </div>
            <div className="text-right">
              <div className="font-bold">{formatPrice(o.amount_total_cents ?? o.unit_price_cents * o.quantity, o.currency)}</div>
              <div className={`text-xs ${o.status === "paid" ? "text-primary" : "text-muted-foreground"}`}>{o.status}</div>
            </div>
          </div>
          {o.status === "paid" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select defaultValue={o.fulfillment_status} onChange={async (e) => { try { await update({ data: { orderId: o.id, fulfillment_status: e.target.value as any, tracking_number: o.tracking_number ?? "" } }); toast.success("Updated"); onChanged(); } catch (err: any) { toast.error(err.message); } }} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
                {FULFILLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input defaultValue={o.tracking_number ?? ""} placeholder="Tracking #" onBlur={async (e) => { if (e.target.value === (o.tracking_number ?? "")) return; await update({ data: { orderId: o.id, fulfillment_status: o.fulfillment_status, tracking_number: e.target.value } }); toast.success("Tracking saved"); onChanged(); }} className="rounded-lg border border-border bg-background px-2 py-1 text-xs" />
              <button onClick={async () => { if (!confirm("Refund this order in full?")) return; const r = await refund({ data: { orderId: o.id } }); if (r.error) toast.error(r.error); else { toast.success("Refunded"); onChanged(); } }} className="ml-auto rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive">Refund</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
