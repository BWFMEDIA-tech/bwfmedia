import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ArrowLeft, Loader2, Minus, Plus, Truck, Nfc, ShieldCheck } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { getStoreProduct, createStoreCheckout } from "@/lib/artist-store.functions";
import { PRODUCT_TYPE_LABELS, formatPrice, isNfcType, type ProductType } from "@/lib/artist-store";
import { useAuth } from "@/lib/auth-context";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/artist-store/$productId")({
  head: () => ({
    meta: [
      { title: "Product — Tunevio Artist Store" },
      { name: "description", content: "Physical music and collectibles sold directly by Tunevio artists." },
      { property: "og:title", content: "Product — Tunevio Artist Store" },
      { property: "og:description", content: "Physical music and collectibles sold directly by Tunevio artists." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const { user } = useAuth();
  const fetchProduct = useServerFn(getStoreProduct);
  const startCheckout = useServerFn(createStoreCheckout);
  const { data, isLoading } = useQuery({ queryKey: ["artist-store-product", productId], queryFn: () => fetchProduct({ data: { id: productId } }) });
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [checkout, setCheckout] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const r = await startCheckout({
      data: {
        productId,
        quantity: qty,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/artist-store/orders?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (r.error || !r.clientSecret) {
      toast.error(r.error ?? "Checkout couldn't start");
      setCheckout(false);
      throw new Error(r.error ?? "Checkout failed");
    }
    return r.clientSecret;
  }, [productId, qty, startCheckout]);

  if (isLoading) return <div className="grid h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const p: any = data?.product;
  if (!p)
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Product not available</h1>
        <Link to="/artist-store" className="mt-4 inline-block text-sm text-primary">Back to the store</Link>
      </main>
    );
  const soldOut = p.inventory <= 0;
  const isOwner = user?.id === p.user_id;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6">
      <Link to="/artist-store" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Artist Store</Link>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-muted">
            {p.images[img] ? <img src={p.images[img]} alt={p.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground">No image</div>}
          </div>
          {p.images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {p.images.map((u: string, i: number) => (
                <button key={u} onClick={() => setImg(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${i === img ? "border-primary" : "border-border"}`}><img src={u} alt="" className="h-full w-full object-cover" /></button>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{PRODUCT_TYPE_LABELS[p.product_type as ProductType]}</span>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{p.title}</h1>
          {p.artist_name && (
            <Link to="/artist/$id" params={{ id: p.user_id }} className="mt-1 inline-block text-sm text-muted-foreground hover:text-primary">by {p.artist_name}</Link>
          )}
          <div className="mt-4 text-3xl font-bold">{formatPrice(p.price_cents, p.currency)}</div>
          <div className={`mt-1 text-sm ${soldOut ? "text-destructive" : "text-muted-foreground"}`}>{soldOut ? "Sold out" : `${p.inventory} available`}</div>
          {p.release && <div className="mt-3 text-sm text-muted-foreground">Release: <span className="text-foreground">{p.release.title}</span></div>}
          {p.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
          {isNfcType(p.product_type) && (
            <div className="mt-4 flex gap-2 rounded-xl border border-border bg-card p-3 text-sm"><Nfc className="h-4 w-4 shrink-0 text-primary" /> Tap this item with a phone to open the artist's music on Tunevio.</div>
          )}
          <div className="mt-4 flex gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <Truck className="h-4 w-4 shrink-0 text-primary" />
            <span className="whitespace-pre-line text-muted-foreground">{p.shipping_info || "Shipping details are shown at checkout."}</span>
          </div>

          {!checkout && (
            <div className="sticky bottom-20 mt-6 flex items-center gap-3 rounded-2xl border border-border bg-background/90 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
              <div className="flex items-center rounded-xl border border-border">
                <button aria-label="Less" className="p-3" onClick={() => setQty((n) => Math.max(1, n - 1))}><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-sm font-bold">{qty}</span>
                <button aria-label="More" className="p-3" onClick={() => setQty((n) => Math.min(10, Math.min(p.inventory, n + 1)))}><Plus className="h-4 w-4" /></button>
              </div>
              {user ? (
                <button disabled={soldOut || isOwner} onClick={() => setCheckout(true)} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {isOwner ? "This is your product" : soldOut ? "Sold out" : `Buy now · ${formatPrice(p.price_cents * qty, p.currency)}`}
                </button>
              ) : (
                <Link to="/login" className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground">Sign in to buy</Link>
              )}
            </div>
          )}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout. Tax and shipping address collected at checkout.</div>
        </div>
      </div>
      {checkout && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </main>
  );
}
