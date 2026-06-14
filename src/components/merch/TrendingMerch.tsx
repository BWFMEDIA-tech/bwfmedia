import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Flame } from "lucide-react";
import { getTrendingMerch } from "@/lib/merch.public.functions";

function fmt(cents: number, currency: string | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);
}

export function TrendingMerch() {
  const fetchFn = useServerFn(getTrendingMerch);
  const { data, isLoading } = useQuery({
    queryKey: ["trending-merch"],
    queryFn: () => fetchFn(),
  });

  if (isLoading || !data?.products?.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-red-400">
            <Flame className="h-4 w-4" /> Trending
          </div>
          <h2 className="mt-1 text-3xl font-black md:text-4xl">Artist Merchandise</h2>
          <p className="mt-1 text-sm text-white/60">Shop straight from the artists you love.</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {data.products.map((p: any) => {
          const firstAvail = p.variants?.find((v: any) => v.available) ?? p.variants?.[0];
          const shop = p.store?.shop_domain;
          const checkout = shop && firstAvail
            ? `https://${shop}/cart/${firstAvail.shopify_variant_id}:1`
            : shop ? `https://${shop}` : "#";
          return (
            <a
              key={p.id}
              href={checkout}
              target="_blank"
              rel="noopener noreferrer"
              className="group block w-[180px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-red-500/40"
            >
              <div className="aspect-square overflow-hidden bg-white/5">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="grid h-full w-full place-items-center"><ShoppingBag className="h-8 w-8 text-white/20" /></div>
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-semibold text-white">{p.title}</div>
                <div className="truncate text-[10px] uppercase tracking-wider text-white/40">{p.store?.shop_name ?? shop}</div>
                <div className="mt-1 text-xs text-red-400">{fmt(p.min_price_cents, p.currency)}</div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}