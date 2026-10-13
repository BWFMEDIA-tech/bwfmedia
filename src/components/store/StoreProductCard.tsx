import { Link } from "@tanstack/react-router";
import { Disc3, Nfc } from "lucide-react";
import { PRODUCT_TYPE_LABELS, formatPrice, isNfcType, type ProductType } from "@/lib/artist-store";

export interface StoreCardProduct {
  id: string;
  title: string;
  product_type: string;
  price_cents: number;
  currency: string;
  inventory: number;
  images: string[];
  artist_name?: string | null;
}

export function StoreProductCard({ p }: { p: StoreCardProduct }) {
  const soldOut = p.inventory <= 0;
  return (
    <Link
      to="/artist-store/$productId"
      params={{ productId: p.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/60"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {p.images[0] ? (
          <img src={p.images[0]} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
        <div className="truncate text-sm font-semibold">{p.title}</div>
        {p.artist_name && <div className="truncate text-xs text-muted-foreground">{p.artist_name}</div>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-primary">{formatPrice(p.price_cents, p.currency)}</span>
          <span className="text-[11px] text-muted-foreground">{soldOut ? "Unavailable" : `${p.inventory} in stock`}</span>
        </div>
      </div>
    </Link>
  );
}
