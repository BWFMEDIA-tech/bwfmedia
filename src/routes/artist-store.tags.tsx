import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ArrowLeft, Loader2, Nfc, ShieldCheck } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { listTagProducts, createTagCheckout, listMyPages } from "@/lib/nfc-pages.functions";
import { formatPrice } from "@/lib/artist-store";
import { useAuth } from "@/lib/auth-context";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/artist-store/tags")({
  head: () => ({
    meta: [
      { title: "Order NFC Tags — Tunevio" },
      { name: "description", content: "Order Tunevio NFC keychains and cards that open your music page with one tap." },
      { property: "og:title", content: "Order NFC Tags — Tunevio" },
      { property: "og:description", content: "Order Tunevio NFC keychains and cards that open your music page with one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TagsPage,
});

function TagsPage() {
  const { user, loading } = useAuth() as any;
  const fetchAll = useServerFn(listTagProducts);
  const fetchPages = useServerFn(listMyPages);
  const startCheckout = useServerFn(createTagCheckout);
  const q = useQuery({ queryKey: ["nfc-tags"], queryFn: () => fetchAll(), enabled: !!user, refetchInterval: (qq) => ((qq.state.data as any)?.orders ?? []).some((o: any) => o.status === "pending") ? 5000 : false });
  const pagesQ = useQuery({ queryKey: ["nfc-pages"], queryFn: () => fetchPages(), enabled: !!user });
  const [productId, setProductId] = useState("");
  const [pageId, setPageId] = useState("");
  const [qty, setQty] = useState(10);
  const [checkout, setCheckout] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const r = await startCheckout({ data: { productId, pageId: pageId || null, quantity: qty, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/artist-store/tags?session_id={CHECKOUT_SESSION_ID}` } });
    if (r.error || !r.clientSecret) { toast.error(r.error ?? "Checkout couldn't start"); setCheckout(false); throw new Error(r.error ?? "failed"); }
    return r.clientSecret;
  }, [productId, pageId, qty, startCheckout]);

  if (!loading && !user) return <main className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-xl font-bold">Sign in to order NFC tags</h1><Link to="/login" className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Sign in</Link></main>;
  if (q.isLoading) return <div className="grid h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const products = q.data?.products ?? [];
  const orders = q.data?.orders ?? [];
  const sel: any = products.find((p: any) => p.id === productId);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-4 sm:px-6">
      <Link to="/artist-store/pages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Your pages</Link>
      <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold uppercase tracking-wider"><Nfc className="h-7 w-7 text-primary" /> Order NFC tags</h1>
      <p className="mt-2 text-sm text-muted-foreground">Tags open one of your pages with a tap. You can sell them to fans in your Artist Store.</p>

      {products.length === 0 ? (
        <div className="mt-6 border border-dashed border-border p-8 text-center"><p className="font-semibold">Pricing coming soon</p><p className="mt-1 text-sm text-muted-foreground">NFC tag ordering opens as soon as Tunevio sets tag prices.</p></div>
      ) : !checkout ? (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p: any) => (
              <button key={p.id} onClick={() => { setProductId(p.id); setQty((n) => Math.max(n, p.min_quantity)); }} className={`border p-4 text-left ${productId === p.id ? "border-primary" : "border-border"}`}>
                <div className="font-bold">{p.name}</div>
                <div className="text-sm text-primary">{formatPrice(p.price_cents, p.currency)} each</div>
                {p.min_quantity > 1 && <div className="text-xs text-muted-foreground">Minimum {p.min_quantity}</div>}
                {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Tags open
              <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Decide later</option>
                {(pagesQ.data?.pages ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Quantity
              <input type="number" min={sel?.min_quantity ?? 1} max={1000} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </label>
          </div>
          <button disabled={!sel || qty < (sel?.min_quantity ?? 1)} onClick={() => setCheckout(true)} className="w-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{sel ? `Checkout · ${formatPrice(sel.price_cents * qty, sel.currency)}` : "Choose a tag"}</button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout. Tax and shipping address collected at checkout.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}><EmbeddedCheckout /></EmbeddedCheckoutProvider>
        </div>
      )}

      <h2 className="mt-10 text-lg font-bold uppercase tracking-wider">Order history</h2>
      {orders.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No tag orders yet.</p> : (
        <div className="mt-3 divide-y divide-border border border-border">
          {orders.map((o: any) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div><div className="font-semibold">{o.quantity} × {o.product_name}</div><div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div></div>
              <div className="text-right">
                <div>{formatPrice(o.amount_total_cents ?? o.unit_price_cents * o.quantity, o.currency)}</div>
                <div className={`text-xs font-semibold uppercase ${o.status === "paid" ? "text-primary" : "text-muted-foreground"}`}>{o.status === "paid" ? `Paid · ${o.fulfillment_status}` : o.status === "pending" ? "Awaiting payment" : o.status}</div>
                {o.tracking_number && <div className="text-xs text-muted-foreground">Tracking {o.tracking_number}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
