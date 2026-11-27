import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShoppingBag, Store } from "lucide-react";
import { listStoreProducts } from "@/lib/artist-store.functions";
import { StoreProductCard, type StoreCardProduct } from "@/components/store/StoreProductCard";

export function ArtistStoreSection({ artistId }: { artistId: string }) {
  const fn = useServerFn(listStoreProducts);
  const { data, isLoading } = useQuery({
    queryKey: ["artist-store-products", artistId],
    queryFn: () => fn({ data: { artistId } }),
    enabled: !!artistId,
  });
  const products = (data?.products ?? []) as StoreCardProduct[];
  const isOwner = data?.isOwner === true;
  if (isLoading || !products.length) return null;

  return (
    <section aria-labelledby="artist-store-heading" className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="artist-store-heading" className="flex items-center gap-2 text-xl font-bold"><ShoppingBag className="h-5 w-5 text-primary" /> Artist Store</h2>
          <p className="mt-1 text-sm text-muted-foreground">Shop physical music, collectibles and merchandise.</p>
        </div>
        {isOwner ? (
          <div className="flex flex-wrap gap-2">
            <Link to="/artist-store/manage" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:border-primary"><Store className="h-4 w-4" /> Manage store</Link>
            <Link to="/artist-store/manage" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:opacity-90"><Plus className="h-4 w-4" /> Add product</Link>
          </div>
        ) : (
          <Link to="/artist-store" className="inline-flex h-10 shrink-0 items-center rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:border-primary">View all products</Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 8).map((p) => <StoreProductCard key={p.id} p={p} ownerPreview={isOwner} />)}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {isOwner ? "Only products marked Live for fans are visible to visitors. Draft and in-review products are private to you." : "Secure checkout. Shipping and any applicable tax are calculated before payment."}
      </p>
    </section>
  );
}
