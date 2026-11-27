import { Link } from "@tanstack/react-router";
import { Disc3, Nfc } from "lucide-react";
import { PRODUCT_TYPE_LABELS, formatPrice, isNfcType, isStoreProductLive, storeProductStatusLabel, type ProductType } from "@/lib/artist-store";

export interface StoreCardProduct {
  id: string;
  title: string;
  product_type: string;
  price_cents: number;
  currency: string;
  inventory: number;
  images: string[];
  artist_name?: string | null;
  status?: string;
  review_status?: string | null;
  made_to_order?: boolean | null;
}

export function StoreProductCard({ p, ownerPreview = false }: { p: StoreCardProduct; ownerPreview?: boolean }) {
  const soldOut = !p.made_to_order && p.inventory <= 0;
  const manage = ownerPreview && !isStoreProductLive(p);
  const body = (
    <>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {p.images[0] ? (
          <img src={p.images[0]} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            {isNfcType(p.product_type) ? <Nfc className="h-10 w-10" /> : <Disc3 className="h-10 w-10" />}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
          {PRODUCT_TYPE_LABELS[p.product_type as ProductType] ?? p.product_type}
        </span>
        {soldOut && <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">Sold out</span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="line-clamp-2 min-h-10 text-sm font-semibold">{p.title}</div>
        {p.artist_name && <div className="truncate text-xs text-muted-foreground">{p.artist_name}</div>}
        {ownerPreview && <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{storeProductStatusLabel(p)}</div>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-bold text-primary">{formatPrice(p.price_cents, p.currency)}</span>
          <span className="text-right text-[11px] text-muted-foreground">{soldOut ? "Unavailable" : p.made_to_order ? "Made to order" : `${p.inventory} in stock`}</span>
        </div>
        <span className={`mt-3 inline-flex h-10 w-full items-center justify-center rounded-md px-2 text-center text-xs font-bold ${soldOut && !ownerPreview ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {manage ? "Manage product" : ownerPreview ? "View product" : soldOut ? "Sold out" : "Buy now"}
        </span>
      </div>
    </>
  );

  if (manage) {
    return <Link to="/artist-store/manage" className="swara-product-card group flex min-w-0 flex-col overflow-hidden rounded-lg transition hover:-translate-y-0.5 motion-reduce:transform-none">{body}</Link>;
  }
  return (
    <Link
      to="/artist-store/$productId"
      params={{ productId: p.id }}
      className="swara-product-card group flex min-w-0 flex-col overflow-hidden rounded-lg transition hover:-translate-y-0.5 motion-reduce:transform-none"
    >
      {body}
    </Link>
  );
}
