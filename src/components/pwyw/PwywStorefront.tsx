import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Disc3, Loader2, Music2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SignedImg } from "@/components/ui/signed-img";
import { listPwywProducts, createPwywCheckout } from "@/lib/pwyw.functions";
import { formatUsd, parseUsdToCents, pwywSplit, validPwywAmount } from "@/lib/pwyw";
import { useAuth } from "@/lib/auth-context";
import { getStripeEnvironment } from "@/lib/stripe";
import { assertDigitalPurchaseAllowed, useDigitalPurchasesAvailable } from "@/lib/purchase-policy";

const TYPE_LABELS: Record<string, string> = { single: "Single", ep: "EP", album: "Full album", deluxe: "Deluxe edition", exclusive: "Exclusive release" };

export function PwywPriceDialog({ product, open, onOpenChange }: { product: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const purchasesAvailable = useDigitalPurchasesAvailable();
  const checkout = useServerFn(createPwywCheckout);
  const [amount, setAmount] = useState(() => (product.min_price_cents / 100).toFixed(2));
  const [pending, setPending] = useState(false);
  const checkoutKey = useRef("");
  const cents = parseUsdToCents(amount);
  const valid = cents !== null && validPwywAmount(cents, product.min_price_cents, product.max_price_cents);
  const split = useMemo(() => pwywSplit(valid && cents !== null ? cents : product.min_price_cents), [cents, valid, product.min_price_cents]);
  const suggestions = (product.suggested_prices_cents?.length ? product.suggested_prices_cents : [product.min_price_cents]) as number[];

  async function startCheckout() {
    if (!user) { window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
    if (!valid || cents === null) { toast.error("Enter an amount within the artist's range"); return; }
    try { assertDigitalPurchaseAllowed(); } catch (error) { toast.error(error instanceof Error ? error.message : "Purchases are unavailable here"); return; }
    setPending(true);
    try {
      checkoutKey.current ||= crypto.randomUUID();
      const result = await checkout({ data: {
        productId: product.id,
        amountCents: cents,
        checkoutKey: checkoutKey.current,
        returnUrl: `${window.location.origin}/library`,
        environment: getStripeEnvironment(),
      } });
      if (!result.url) { checkoutKey.current = ""; toast.error(result.error || "Checkout could not be opened"); return; }
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout could not be opened");
    } finally { setPending(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle className="text-2xl">Pay What You Want</DialogTitle>
        <DialogDescription>Choose your price. You receive the same music at every amount.</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-3">
        <SignedImg src={product.artwork_url} alt={`${product.title} artwork`} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0"><p className="truncate text-lg font-semibold">{product.title}</p><p className="text-sm text-muted-foreground">{product.artist_name}</p><p className="text-xs text-muted-foreground">{TYPE_LABELS[product.product_type]} · {product.track_count} track{product.track_count === 1 ? "" : "s"}</p></div>
      </div>
      <div className="space-y-2">
        <label htmlFor="pwyw-amount" className="text-sm font-medium">Choose your price</label>
        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">$</span><Input id="pwyw-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-14 pl-9 text-2xl font-bold" aria-describedby="pwyw-range" /></div>
        <p id="pwyw-range" className={`text-sm ${valid ? "text-muted-foreground" : "text-destructive"}`}>{formatUsd(product.min_price_cents)} minimum · {formatUsd(product.max_price_cents)} maximum</p>
      </div>
      <Slider min={product.min_price_cents} max={product.max_price_cents} step={1} value={[valid && cents !== null ? cents : product.min_price_cents]} onValueChange={([value]) => value !== undefined && setAmount((value / 100).toFixed(2))} aria-label="Choose your price in cents" />
      <div className="flex flex-wrap gap-2">{suggestions.map((price) => <Button key={price} type="button" variant={cents === price ? "default" : "outline"} size="sm" onClick={() => setAmount((price / 100).toFixed(2))}>{formatUsd(price)}</Button>)}</div>
      <div className="grid grid-cols-3 gap-2 rounded-xl border p-4 text-center">
        <div><p className="text-xs text-muted-foreground">Fan pays</p><p className="font-semibold">{formatUsd(valid && cents !== null ? cents : 0)}</p></div>
        <div><p className="text-xs text-muted-foreground">Artist share</p><p className="font-semibold text-primary">{formatUsd(split.artistCents)}</p></div>
        <div><p className="text-xs text-muted-foreground">Tunevio share</p><p className="font-semibold">{formatUsd(split.platformCents)}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">60% artist / 40% Tunevio before processing fees, refunds, and taxes. Applicable tax appears at checkout.</p>
      {!purchasesAvailable && <p className="rounded-lg border p-3 text-sm text-muted-foreground">Tunevio for iPhone supports listening to purchases. Use the web app to make new purchases.</p>}
      <Button className="h-12 w-full text-base" disabled={!valid || pending || !purchasesAvailable} onClick={() => void startCheckout()}>{pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Choose Your Price</Button>
      <p className="text-center text-xs text-muted-foreground">Secure checkout · purchase access appears in Library → Purchases</p>
    </DialogContent>
  </Dialog>;
}

function ProductCard({ product }: { product: any }) {
  const [open, setOpen] = useState(false);
  return <article className="w-[280px] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-sm sm:w-[320px]">
    <SignedImg src={product.artwork_url} alt={`${product.title} cover`} className="aspect-square w-full object-cover" />
    <div className="space-y-3 p-4">
      <div><p className="text-xs font-medium uppercase tracking-wider text-primary">{TYPE_LABELS[product.product_type]}</p><h3 className="mt-1 truncate text-xl font-bold">{product.title}</h3><p className="text-sm text-muted-foreground">{product.artist_name} · {product.track_count} track{product.track_count === 1 ? "" : "s"}</p></div>
      {product.description && <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
      <div className="flex items-center justify-between gap-2"><div><p className="font-semibold">Pay what you want</p><p className="text-xs text-muted-foreground">From {formatUsd(product.min_price_cents)}</p></div><Music2 className="text-primary" /></div>
      <Button className="w-full" onClick={() => setOpen(true)}>Choose Your Price</Button>
    </div>
    {open && <PwywPriceDialog product={product} open={open} onOpenChange={setOpen} />}
  </article>;
}

export function PwywStorefront({ artistId, showEmpty = false }: { artistId?: string; showEmpty?: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ["pwyw-products", artistId ?? "all"], queryFn: () => listPwywProducts({ data: artistId ? { artistId } : {} }) });
  const products = data?.products ?? [];
  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>;
  if (!products.length) return showEmpty ? <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">New Pay What You Want releases will appear here when artists publish them.</div> : null;
  return <section className="space-y-4" aria-labelledby="pwyw-store-title">
    <div className="flex items-center gap-3"><Disc3 className="text-primary" /><div><h2 id="pwyw-store-title" className="text-2xl font-bold">Music Store</h2><p className="text-sm text-muted-foreground">Support the artist directly. Choose your price.</p></div></div>
    <div className="flex gap-4 overflow-x-auto pb-3" data-smooth-scroll="true">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
  </section>;
}
