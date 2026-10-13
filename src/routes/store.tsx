import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, Disc3, ShoppingBag, Search, Radio, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { getTrendingMerch } from "@/lib/merch.public.functions";
import { productCategory, storeCategories, storeCheckout, storePrice, type StoreCategory, type StoreProduct } from "@/lib/store-catalog";
import collectionImage from "@/assets/store-collection.jpg";

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [
    { title: "Tunevio Store — Physical Music & Collectibles" },
    { name: "description", content: "Explore physical music, artist merchandise and collectibles from connected Tunevio artist stores. Discover the upcoming NFC-linked fan experience." },
    { property: "og:title", content: "Tunevio Store — Physical Music & Collectibles" },
    { property: "og:description", content: "Explore physical music, artist merchandise and collectibles from connected Tunevio artist stores. Discover the upcoming NFC-linked fan experience." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: StorePage,
});

function StorePage() {
  const fetchCatalog = useServerFn(getTrendingMerch);
  const catalog = useQuery({ queryKey: ["trending-merch"], queryFn: () => fetchCatalog() });
  const [category, setCategory] = useState<StoreCategory>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const products = (catalog.data?.products ?? []) as StoreProduct[];
  const visible = products.filter((product) => (category === "All" || productCategory(product.title) === category) && `${product.title} ${product.store?.shop_name ?? ""}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "price-low" ? a.min_price_cents - b.min_price_cents : sort === "name" ? a.title.localeCompare(b.title) : 0);
  function showCollection() { document.getElementById("store-catalog")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }
  return <main className="tunevio-store bg-background text-foreground">
    <section className="store-cover relative isolate overflow-hidden">
      <img src={collectionImage} width={1920} height={1024} alt="Concept collection of vinyl, a metallic NFC card and artist apparel" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="store-cover-shade absolute inset-0 -z-10" />
      <div className="mx-auto flex h-full max-w-[1440px] flex-col justify-center px-5 sm:px-8 lg:px-12">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><span className="h-px w-6 bg-primary" /> The physical music collection</div>
        <h1 className="store-title text-5xl font-bold sm:text-6xl lg:text-7xl">TUNEVIO<br /><span className="text-brand-silver">STORE</span></h1>
        <p className="mt-5 max-w-xs text-base leading-relaxed text-brand-silver sm:max-w-sm sm:text-lg">Music you can hold.<br />Artists you can carry with you.</p>
        <Button size="lg" onClick={showCollection} className="mt-7 w-fit gap-5">Explore the collection <ArrowDown /></Button>
      </div>
      <span className="absolute bottom-4 right-5 text-[10px] text-brand-silver">Concept collection · not listed for sale</span>
    </section>
    <div className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-[1440px] grid-cols-3 px-3 py-5 sm:px-8 lg:px-12">
        {[{icon: Disc3, title: "Physical music", text: "Beyond the stream"}, {icon: ShoppingBag, title: "Artist merchandise", text: "From the artist’s store"}, {icon: Radio, title: "NFC experience", text: "Coming soon"}].map(({icon: Icon, title, text}) => <div key={title} className="flex flex-col items-center gap-2 px-1 text-center sm:flex-row sm:gap-3 sm:text-left"><Icon className="h-5 w-5 shrink-0 text-primary" /><div><div className="text-xs font-semibold sm:text-sm">{title}</div><div className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{text}</div></div></div>)}
      </div>
    </div>
    <section id="store-catalog" className="mx-auto max-w-[1440px] scroll-mt-28 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase text-primary">From the artists</p><h2 className="store-title mt-2 text-3xl font-semibold sm:text-4xl">The collection</h2></div><Button asChild variant="outline" className="gap-3"><Link to="/settings/merch">Connect your store <ArrowUpRight /></Link></Button></div>
      <div className="mt-7 flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Product categories">{storeCategories.map((item) => <Button key={item} variant={category === item ? "secondary" : "ghost"} aria-pressed={category === item} onClick={() => setCategory(item)} className={category === item ? "shrink-0 border border-primary/40 text-primary" : "shrink-0 text-muted-foreground"}>{item}</Button>)}</div>
        <div className="flex gap-3"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input px-3"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input aria-label="Search collection" placeholder="Search collection" value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full min-w-0 bg-transparent text-sm outline-none" /></label><label className="flex items-center gap-2 rounded-md border border-input px-2"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /><select aria-label="Sort collection" value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 max-w-28 bg-background text-xs outline-none"><option value="featured">Featured</option><option value="price-low">Price: low first</option><option value="name">Name: A–Z</option></select></label></div>
      </div>
      {catalog.isPending ? <div className="grid grid-cols-2 gap-4 py-6 lg:grid-cols-4" aria-label="Loading collection">{[0,1,2,3].map((item) => <div key={item} className="aspect-square animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />)}</div> : catalog.isError ? <div role="alert" className="py-16 text-center"><p className="text-muted-foreground">The collection couldn’t load.</p><Button variant="outline" className="mt-4" onClick={() => catalog.refetch()}><RefreshCw /> Try again</Button></div> : visible.length ? <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{visible.map((product) => <StoreProductCard key={product.id} product={product} />)}</div> : <div className="flex min-h-56 flex-col items-center justify-center py-10 text-center"><Disc3 className="mb-4 h-9 w-9 text-primary/60" /><h3 className="text-lg font-semibold">{products.length ? "No matching products" : "The next drop is on its way"}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{products.length ? "Try another category or search." : "No artist products are published yet. Artist stores will appear here when their catalogs are connected and published."}</p>{products.length > 0 && <Button variant="link" className="mt-3" onClick={() => {setCategory("All");setSearch("");}}>Clear filters</Button>}</div>}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Purchases complete at the artist’s store. Shipping, taxes, returns and fulfillment are confirmed there.</p>
    </section>
    <section className="store-nfc border-y border-border bg-card">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-12 lg:py-16">
        <div><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Radio className="h-4 w-4" /> NFC · Coming soon</span><h2 className="store-title mt-4 text-3xl font-semibold sm:text-4xl">A physical connection.<br />A digital world.</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">A future collection of tap-enabled music and collectibles, connecting physical releases to artist content. NFC activation and exclusive access are not available yet.</p><Button asChild variant="outline" className="mt-6"><Link to="/artists">Meet the artists <ArrowUpRight /></Link></Button></div>
        <div className="flex flex-col justify-center divide-y divide-border">{[{n:"01",title:"Collect",text:"Physical music, artist apparel and collectible objects."},{n:"02",title:"Tap",text:"NFC-linked editions planned for compatible phones."},{n:"03",title:"Connect",text:"Artist-linked content, with access defined by each future release."}].map((item) => <div key={item.n} className="flex gap-5 py-5"><span className="pt-1 text-xs text-primary">{item.n}</span><div><h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.text}</p></div></div>)}</div>
      </div>
    </section>
    <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground sm:px-8 lg:px-12"><span>TUNEVIO · Your music. Your stage. Your audience.</span><Link to="/contact" className="text-foreground hover:text-primary">Store questions <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link></footer>
  </main>;
}

function StoreProductCard({product}: {product: StoreProduct}) {
  const checkout = storeCheckout(product);
  return <article className="group min-w-0 overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
    <div className="aspect-square overflow-hidden bg-muted">{product.image_url ? <SignedImg src={product.image_url} alt={product.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" /> : <div className="grid h-full place-items-center"><ShoppingBag className="h-12 w-12 text-muted-foreground" /></div>}</div>
    <div className="p-3 sm:p-4"><p className="truncate text-[10px] uppercase text-primary">{product.store?.shop_name ?? "Artist store"}</p><h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold">{product.title}</h3><p className="mt-3 text-sm text-brand-silver">{product.max_price_cents > product.min_price_cents ? "From " : ""}{storePrice(product.min_price_cents, product.currency)}</p>{checkout ? <Button asChild className="mt-4 h-11 w-full px-2"><a href={checkout} target="_blank" rel="noopener noreferrer">Buy now <ArrowUpRight /></a></Button> : <Button disabled variant="secondary" className="mt-4 h-11 w-full px-2">Unavailable</Button>}</div>
  </article>;
}