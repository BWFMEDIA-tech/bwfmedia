import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Store, Nfc, Package, Search, Loader2 } from "lucide-react";
import { listStoreProducts } from "@/lib/artist-store.functions";
import { PRODUCT_TYPE_LABELS, type ProductType } from "@/lib/artist-store";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import hero from "@/assets/artist-store-hero.jpg";
import collection from "@/assets/store-collection.jpg";

const TITLE = "Artist Store — Vinyl, CDs & NFC Keychains | Tunevio";
const DESC = "Own your favorite artists' music on vinyl, CDs, cassettes and NFC keychains. Shop physical releases straight from Tunevio artists.";

export const Route = createFileRoute("/artist-store/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArtistStorePage,
});

const CATS: Array<{ key: "all" | ProductType; label: string }> = [
  { key: "all", label: "All" },
  ...(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((k) => ({ key: k, label: PRODUCT_TYPE_LABELS[k] })),
];

function ArtistStorePage() {
  const fetchProducts = useServerFn(listStoreProducts);
  const { data, isLoading } = useQuery({ queryKey: ["artist-store-products"], queryFn: () => fetchProducts({ data: {} }) });
  const [cat, setCat] = useState<"all" | ProductType>("all");
  const [q, setQ] = useState("");
  const products = data?.products ?? [];
  const visible = products.filter(
    (p: any) => (cat === "all" || p.product_type === cat) && `${p.title} ${p.artist_name ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const featured = products.filter((p: any) => p.is_featured).slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <img src={hero} alt="Vinyl record, CD and NFC keychain" width={1600} height={912} className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]" />
        <div className="p-5 sm:p-8">
          <h1 className="text-2xl font-bold sm:text-4xl">Your Music. Something Real.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Turn your releases into collectible products. Let fans own your music on vinyl, CDs, NFC keychains, and other physical formats.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <Link to="/artist-store/manage" className="flex flex-col items-center gap-1.5 rounded-xl bg-primary px-2 py-4 text-center text-xs font-bold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition hover:opacity-90 sm:text-sm">
              <Store className="h-4 w-4" /> Artist Store
            </Link>
            <button onClick={() => setCat("nfc_keychain")} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/60 px-2 py-4 text-xs font-bold transition hover:border-primary sm:text-sm">
              <Nfc className="h-4 w-4" /> NFC Products
            </button>
            <Link to="/artist-store/orders" className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/60 px-2 py-4 text-xs font-bold transition hover:border-primary sm:text-sm">
              <Package className="h-4 w-4" /> Orders
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => setCat("nfc_keychain")} className="text-left">
          <div className="overflow-hidden rounded-2xl border border-border"><img src={hero} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover object-[60%_80%]" /></div>
          <div className="mt-2 text-sm font-semibold">NFC Music Keychains</div>
          <div className="text-xs text-muted-foreground">Tap to open an artist's music or release page.</div>
        </button>
        <button onClick={() => setCat("vinyl")} className="text-left">
          <div className="overflow-hidden rounded-2xl border border-border"><img src={collection} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" /></div>
          <div className="mt-2 text-sm font-semibold">Physical Releases</div>
          <div className="text-xs text-muted-foreground">CDs, vinyl, and other collectible formats.</div>
        </button>
      </section>

      {featured.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Featured releases</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{featured.map((p: any) => <StoreProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section id="catalog" className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Shop</h2>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 sm:w-72">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or artists" className="w-full bg-transparent text-sm outline-none" />
          </label>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${cat === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {c.label}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {products.length === 0 ? "No physical products are on sale yet. Artists can add theirs from the Artist Store." : "Nothing matches that search."}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map((p: any) => <StoreProductCard key={p.id} p={p} />)}</div>
        )}
      </section>
    </main>
  );
}
