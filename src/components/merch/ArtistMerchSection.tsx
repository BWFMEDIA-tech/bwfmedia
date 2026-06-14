import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, ExternalLink } from "lucide-react";
import { getArtistMerch } from "@/lib/merch.public.functions";

function fmt(cents: number, currency: string | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);
}

export function ArtistMerchSection({ userId }: { userId: string }) {
  const fetchFn = useServerFn(getArtistMerch);
  const { data, isLoading } = useQuery({
    queryKey: ["artist-merch", userId],
    queryFn: () => fetchFn({ data: { userId } }),
    enabled: !!userId,
  });

  if (isLoading) return null;
  if (!data?.store || data.products.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="h-4 w-4 text-red-500" /> Merchandise
          </h3>
          <p className="text-xs text-white/50">Powered by {data.store.shop_name ?? "Shopify"} · Secure checkout on {data.store.shop_domain}</p>
        </div>
        <a
          href={`https://${data.store.shop_domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:underline"
        >
          Full store <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.products.map((p: any) => {
          const firstAvail = p.variants?.find((v: any) => v.available) ?? p.variants?.[0];
          const checkout = firstAvail
            ? `https://${data.store!.shop_domain}/cart/${firstAvail.shopify_variant_id}:1`
            : `https://${data.store!.shop_domain}/products/${p.handle}`;
          return (
            <div key={p.id} className="group overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <a href={`https://${data.store!.shop_domain}/products/${p.handle}`} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden bg-white/5">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="grid h-full w-full place-items-center"><ShoppingBag className="h-8 w-8 text-white/20" /></div>
                )}
              </a>
              <div className="p-3">
                <div className="truncate text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-white/60">
                  {fmt(p.min_price_cents, p.currency)}
                  {p.max_price_cents > p.min_price_cents ? ` – ${fmt(p.max_price_cents, p.currency)}` : ""}
                </div>
                <a
                  href={checkout}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block w-full rounded-md bg-red-600 px-3 py-1.5 text-center text-xs font-bold hover:bg-red-500"
                >
                  Buy now
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}