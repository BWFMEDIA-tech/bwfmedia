import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Disc3 } from "lucide-react";
import { listStoreProducts } from "@/lib/artist-store.functions";
import { StoreProductCard } from "@/components/store/StoreProductCard";

export function ArtistStoreSection({ artistId }: { artistId: string }) {
  const fn = useServerFn(listStoreProducts);
  const { data } = useQuery({ queryKey: ["artist-store-products", artistId], queryFn: () => fn({ data: { artistId } }), enabled: !!artistId });
  const products = data?.products ?? [];
  if (!products.length) return null;
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold"><Disc3 className="h-4 w-4 text-primary" /> Physical music</h3>
        <Link to="/artist-store" className="text-xs text-primary hover:underline">Artist Store</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.slice(0, 8).map((p: any) => <StoreProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}
