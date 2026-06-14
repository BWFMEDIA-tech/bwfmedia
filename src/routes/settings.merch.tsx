import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingBag, RefreshCw, ExternalLink, Star, Unplug } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";
import {
  getMyShopifyStore,
  syncShopifyProducts,
  disconnectShopifyStore,
  toggleProductFeatured,
  startShopifyInstall,
} from "@/lib/merch.functions";

export const Route = createFileRoute("/settings/merch")({
  validateSearch: (s: Record<string, unknown>) => ({ connected: s.connected === "1" || s.connected === 1 }),
  component: MerchPage,
});

function MerchPage() {
  const { user } = useAuth();
  const search = useSearch({ from: "/settings/merch" });
  const qc = useQueryClient();
  const fetchStore = useServerFn(getMyShopifyStore);
  const syncFn = useServerFn(syncShopifyProducts);
  const disconnectFn = useServerFn(disconnectShopifyStore);
  const featureFn = useServerFn(toggleProductFeatured);

  const { data, isLoading } = useQuery({
    queryKey: ["my-shopify-store"],
    queryFn: () => fetchStore(),
    enabled: !!user,
  });

  useEffect(() => {
    if (search.connected) toast.success("Shopify store connected!");
  }, [search.connected]);

  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r) => { toast.success(`Synced ${r.synced} products`); qc.invalidateQueries({ queryKey: ["my-shopify-store"] }); },
    onError: (e: any) => toast.error(e.message ?? "Sync failed"),
  });
  const disconnect = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => { toast.success("Disconnected"); qc.invalidateQueries({ queryKey: ["my-shopify-store"] }); },
  });
  const feature = useMutation({
    mutationFn: (v: { productId: string; featured: boolean }) => featureFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-shopify-store"] }),
  });

  if (isLoading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  if (!data?.store) return <ConnectCard userId={user?.id} />;

  const products = data.products;
  return (
    <SettingsShell title="Merch Store" blurb="Your Shopify catalog, live on BWF Network.">
      <Card icon={<ShoppingBag className="h-4 w-4 text-red-500" />} title={data.store.shop_name ?? data.store.shop_domain}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-white/60">
            <div>Domain: <span className="text-white/90">{data.store.shop_domain}</span></div>
            <div>Last synced: {data.store.last_synced_at ? new Date(data.store.last_synced_at).toLocaleString() : "—"}</div>
          </div>
          <div className="flex gap-2">
            <a href={`https://${data.store.shop_domain}/admin`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
              <ExternalLink className="h-3.5 w-3.5" /> Shopify admin
            </a>
            <button onClick={() => sync.mutate()} disabled={sync.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-500 disabled:opacity-50">
              {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync products
            </button>
            <button onClick={() => { if (confirm("Disconnect Shopify store?")) disconnect.mutate(); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">
              <Unplug className="h-3.5 w-3.5" /> Disconnect
            </button>
          </div>
        </div>
      </Card>

      <Card title={`Products (${products.length})`}>
        {products.length === 0 ? (
          <div className="py-8 text-center text-sm text-white/50">
            No products synced yet. Click <strong>Sync products</strong> to pull from Shopify.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p: any) => (
              <div key={p.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="aspect-square w-full bg-white/5">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{p.title}</div>
                  <div className="mt-0.5 text-xs text-white/60">
                    {fmt(p.min_price_cents, p.currency)}
                    {p.max_price_cents > p.min_price_cents ? ` – ${fmt(p.max_price_cents, p.currency)}` : ""}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                    {p.total_inventory ?? 0} in stock · {p.is_published ? "Published" : "Draft"}
                  </div>
                  <button onClick={() => feature.mutate({ productId: p.id, featured: !p.is_featured })}
                    className={`mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] uppercase tracking-wider ${
                      p.is_featured ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-white/10 text-white/60 hover:bg-white/5"
                    }`}>
                    <Star className={`h-3 w-3 ${p.is_featured ? "fill-yellow-400" : ""}`} />
                    {p.is_featured ? "Featured" : "Feature on profile"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </SettingsShell>
  );
}

function fmt(cents: number, currency: string | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);
}

function ConnectCard({ userId }: { userId?: string }) {
  const [shop, setShop] = useState("");
  const startInstall = useServerFn(startShopifyInstall);
  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const clean = shop.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const full = clean.endsWith(".myshopify.com") ? clean : `${clean}.myshopify.com`;
    try {
      const { authUrl } = await startInstall({ data: { shop: full, origin: window.location.origin } });
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start Shopify install");
    }
  }
  return (
    <SettingsShell title="Merch Store" blurb="Connect your Shopify store to sell merch on BWF Network.">
      <Card icon={<ShoppingBag className="h-4 w-4 text-red-500" />} title="Connect Shopify">
        <form onSubmit={connect} className="space-y-3">
          <label className="block text-xs uppercase tracking-wider text-white/60">Your Shopify store</label>
          <div className="flex overflow-hidden rounded-md border border-white/10 bg-black/40">
            <input
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="yourstore"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/30"
              required
            />
            <span className="grid place-items-center bg-white/5 px-3 text-xs text-white/60">.myshopify.com</span>
          </div>
          <button type="submit" disabled={!userId || !shop}
            className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500 disabled:opacity-50">
            Connect with Shopify
          </button>
          <p className="text-xs text-white/50">
            You'll be redirected to Shopify to authorize BWF Network. We sync your product catalog and never touch checkout — fans pay through your Shopify store.
          </p>
        </form>
      </Card>
    </SettingsShell>
  );
}