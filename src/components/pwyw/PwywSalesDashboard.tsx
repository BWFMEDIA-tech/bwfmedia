import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, DollarSign, Edit2, ImagePlus, Loader2, Music2, Plus, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignedImg } from "@/components/ui/signed-img";
import { PlanGate } from "@/components/billing/PlanGate";
import { deletePwywProduct, getMyPwywStore, refundPwywPurchase, savePwywProduct } from "@/lib/pwyw.functions";
import { PWYW_PRODUCT_TYPES, formatUsd, parseUsdToCents } from "@/lib/pwyw";
import { cropImageToSquare } from "@/lib/square-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

function ProductArtworkUpload({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function upload(file?: File) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const square = await cropImageToSquare(file);
      if (square.size > 8 * 1024 * 1024) throw new Error("Artwork must be 8MB or smaller");
      const extension = (square.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/pwyw-covers/${crypto.randomUUID()}.${extension || "jpg"}`;
      const { error } = await supabase.storage.from("avatars").upload(path, square, { contentType: square.type || "image/jpeg", upsert: false, cacheControl: "3600" });
      if (error) throw error;
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(square));
      onChange(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
      toast.success("Square product artwork uploaded");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Artwork upload failed"); }
    finally { setUploading(false); }
  }
  return <div className="space-y-2"><Label>Product artwork</Label><div className="flex items-center gap-3 rounded-xl border p-3">
    <button type="button" className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed" onClick={() => input.current?.click()} aria-label="Upload product artwork">
      {preview ? <img src={preview} alt="New product artwork preview" className="h-full w-full object-cover" /> : value ? <SignedImg src={value} alt="Product artwork" className="h-full w-full object-cover" /> : <ImagePlus className="text-primary" />}
    </button>
    <div className="space-y-2"><p className="text-xs text-muted-foreground">Square JPG, PNG, or WebP · cropped to 1:1 · up to 8MB</p><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => input.current?.click()}>{uploading && <Loader2 className="animate-spin" />}{value ? "Replace artwork" : "Upload artwork"}</Button>{value && <Button type="button" size="sm" variant="ghost" onClick={() => { setPreview(null); onChange(null); }}>Remove</Button>}</div></div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
  </div></div>;
}

function ProductEditor({ product, catalog, open, onClose, onSaved }: { product: any; catalog: any[]; open: boolean; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(savePwywProduct);
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [type, setType] = useState(product?.product_type ?? "single");
  const [min, setMin] = useState(product ? (product.min_price_cents / 100).toFixed(2) : "1.00");
  const [max, setMax] = useState(product ? (product.max_price_cents / 100).toFixed(2) : "10000.00");
  const [suggested, setSuggested] = useState<string>(product?.suggested_prices_cents?.map((cents: number) => (cents / 100).toFixed(2)).join(", ") ?? "1.00, 5.00, 10.00, 25.00, 50.00, 100.00");
  const [trackIds, setTrackIds] = useState<string[]>(product?.track_ids ?? []);
  const [artwork, setArtwork] = useState<string | null>(product?.artwork_url ?? null);
  const [status, setStatus] = useState(product?.status ?? "draft");
  const [enabled, setEnabled] = useState(product?.pwyw_enabled ?? true);
  const [pending, setPending] = useState(false);
  const artworkOptions = [...new Set(trackIds.map((id) => catalog.find((track) => track.id === id)?.cover_url).filter(Boolean))] as string[];

  function toggleTrack(id: string) {
    const next = trackIds.includes(id) ? trackIds.filter((trackId) => trackId !== id) : [...trackIds, id];
    setTrackIds(next);
    if (artwork && !next.some((trackId) => catalog.find((track) => track.id === trackId)?.cover_url === artwork)) setArtwork(null);
  }

  async function submit() {
    const minCents = parseUsdToCents(min);
    const maxCents = parseUsdToCents(max);
    const prices = suggested.split(",").map((value) => parseUsdToCents(value));
    if (minCents === null || maxCents === null || prices.some((price: number | null) => price === null)) { toast.error("Use valid USD amounts with no more than two decimals"); return; }
    if (!trackIds.length) { toast.error("Select at least one uploaded song"); return; }
    if (type === "single" && trackIds.length !== 1) { toast.error("A single contains exactly one song"); return; }
    if (status === "published" && !(artwork || artworkOptions[0])) { toast.error("Select a song with artwork before publishing"); return; }
    setPending(true);
    try {
      await save({ data: {
        id: product?.id,
        title, description, productType: type,
        artworkUrl: artwork || artworkOptions[0] || null,
        releaseId: product?.release_id ?? null,
        enabled, status, minPriceCents: minCents, maxPriceCents: maxCents,
        suggestedPricesCents: prices as number[], trackIds,
      } });
      toast.success("Music product saved"); onSaved(); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Product could not be saved"); }
    finally { setPending(false); }
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>{product ? "Edit music product" : "Sell existing music"}</DialogTitle><DialogDescription>Group tracks you already uploaded. No duplicate audio upload is needed.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="pwyw-title">Release title</Label><Input id="pwyw-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} /></div>
      <div className="space-y-2"><Label htmlFor="pwyw-type">Product type</Label><select id="pwyw-type" className="flex h-10 w-full rounded-md border bg-background px-3" value={type} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setType(event.target.value)}>{PWYW_PRODUCT_TYPES.map((value) => <option key={value} value={value}>{value === "ep" ? "EP" : value[0]!.toUpperCase() + value.slice(1)}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="pwyw-status">Visibility</Label><select id="pwyw-status" className="flex h-10 w-full rounded-md border bg-background px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="pwyw-description">Description</Label><Textarea id="pwyw-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} /></div>
      <div className="space-y-2"><Label htmlFor="pwyw-min">Minimum price (USD)</Label><Input id="pwyw-min" inputMode="decimal" value={min} onChange={(event) => setMin(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="pwyw-max">Maximum price (USD)</Label><Input id="pwyw-max" inputMode="decimal" value={max} onChange={(event) => setMax(event.target.value)} /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="pwyw-suggested">Suggested prices, separated by commas</Label><Input id="pwyw-suggested" value={suggested} onChange={(event) => setSuggested(event.target.value)} /><p className="text-xs text-muted-foreground">Fans can always enter another amount within your range.</p></div>
    </div>
    <div className="space-y-3"><div className="flex items-center justify-between"><Label>Select existing songs</Label><span className="text-sm text-muted-foreground">{trackIds.length} selected</span></div><div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-3">{catalog.map((track) => <label key={track.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted/50"><input type="checkbox" className="h-5 w-5" checked={trackIds.includes(track.id)} onChange={() => toggleTrack(track.id)} /><SignedImg src={track.cover_url} alt="" className="h-11 w-11 rounded object-cover" /><span className="min-w-0"><span className="block truncate font-medium">{track.title}</span><span className="text-xs text-muted-foreground">{track.audio_url ? "Audio ready" : "No audio"}</span></span></label>)}</div></div>
    <ProductArtworkUpload value={artwork} onChange={setArtwork} />
    {artworkOptions.length > 0 && <div className="space-y-2"><Label htmlFor="pwyw-artwork">Or use selected song artwork</Label><select id="pwyw-artwork" className="flex h-10 w-full rounded-md border bg-background px-3" value={artwork ?? artworkOptions[0]} onChange={(event) => setArtwork(event.target.value)}>{artwork && !artworkOptions.includes(artwork) && <option value={artwork}>Uploaded product artwork</option>}{artworkOptions.map((url, index) => <option key={url} value={url}>Selected song artwork {index + 1}</option>)}</select></div>}
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enable Pay What You Want for this product</label>
    <Button className="w-full" disabled={pending || !title.trim()} onClick={() => void submit()}>{pending && <Loader2 className="animate-spin" />}Save music product</Button>
  </DialogContent></Dialog>;
}

export function PwywSalesDashboard() {
  const queryClient = useQueryClient();
  const remove = useServerFn(deletePwywProduct);
  const refund = useServerFn(refundPwywPurchase);
  const { data, isLoading } = useQuery({ queryKey: ["my-pwyw-store"], queryFn: () => getMyPwywStore() });
  const [editor, setEditor] = useState<{ open: boolean; product?: any }>({ open: false });
  const refundMutation = useMutation({ mutationFn: (purchaseId: string) => refund({ data: { purchaseId } }), onSuccess: (result) => { if (result.error) toast.error(result.error); else toast.success("Refund requested; access changes after Stripe confirms it"); void queryClient.invalidateQueries({ queryKey: ["my-pwyw-store"] }); } });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["my-pwyw-store"] });
  const sales = data?.sales ?? [];
  const earnings = data?.earnings ?? [];
  const stats = useMemo(() => {
    const saleRows = earnings.filter((entry: any) => entry.entry_type === "sale");
    const sum = (key: string) => earnings.reduce((total: number, entry: any) => total + entry[key], 0);
    const gross = saleRows.reduce((total: number, entry: any) => total + entry.amount_cents, 0);
    return { units: saleRows.length, gross, artist: sum("artist_cents"), platform: sum("platform_cents"), artistNet: sum("artist_cents") - sum("artist_fee_cents"), fees: sum("fee_cents"), average: saleRows.length ? Math.round(gross / saleRows.length) : 0, highest: saleRows.reduce((max: number, entry: any) => Math.max(max, entry.amount_cents), 0) };
  }, [earnings]);
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!data?.canSell) return <PlanGate perk="pwyw_store" title="Sell music with Pay What You Want"><div /></PlanGate>;
  const byType = PWYW_PRODUCT_TYPES.map((type) => ({ type, units: sales.filter((sale: any) => sale.product_type === type && ["paid", "refunded", "chargeback"].includes(sale.status)).length })).filter((row) => row.units);
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Music Sales</h1><p className="text-muted-foreground">Pay What You Want · 60% artist / 40% Tunevio before fees, refunds, and taxes</p></div><Button onClick={() => setEditor({ open: true })}><Plus />Sell existing music</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Gross music sales", formatUsd(stats.gross)], ["Artist share", formatUsd(stats.artist)], ["Artist after allocated fees", formatUsd(stats.artistNet)], ["Tunevio commission", formatUsd(stats.platform)], ["Units sold", String(stats.units)], ["Average fan payment", formatUsd(stats.average)], ["Highest fan payment", formatUsd(stats.highest)], ["Recorded processing fees", formatUsd(stats.fees)]].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
    <p className="text-sm text-muted-foreground">Accounting only: this dashboard does not promise funds are cleared or paid out. Taxes and processing fees are recorded separately when Stripe supplies them.</p>
    <section className="space-y-4"><div className="flex items-center gap-2"><Music2 className="text-primary" /><h2 className="text-xl font-semibold">Your products</h2></div>
      {!data.products.length && <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Choose uploaded songs to create your first Pay What You Want release.</div>}
      <div className="grid gap-4 md:grid-cols-2">{data.products.map((product: any) => <article key={product.id} className="flex gap-4 rounded-xl border bg-card p-4"><SignedImg src={product.artwork_url} alt={`${product.title} artwork`} className="h-24 w-24 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="truncate font-semibold">{product.title}</h3><p className="text-sm capitalize text-muted-foreground">{product.product_type} · {product.track_ids.length} tracks</p></div><span className="rounded-full border px-2 py-0.5 text-xs capitalize">{product.status}</span></div><p className="mt-2 text-sm">{formatUsd(product.min_price_cents)} – {formatUsd(product.max_price_cents)}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditor({ open: true, product })}><Edit2 />Edit</Button>{product.status === "published" && product.pwyw_enabled && <Button size="sm" variant="ghost" asChild><Link to="/artist/$id" params={{ id: product.artist_user_id }}>View storefront</Link></Button>}<Button size="sm" variant="ghost" onClick={async () => { if (!window.confirm("Delete this product? Products with purchase history must be unpublished instead.")) return; try { await remove({ data: { id: product.id } }); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete"); } }}><Trash2 />Delete</Button></div></div></article>)}</div>
    </section>
    {byType.length > 0 && <section className="rounded-xl border p-4"><div className="flex items-center gap-2"><BarChart3 /><h2 className="font-semibold">Sales by product type</h2></div><div className="mt-3 flex flex-wrap gap-3">{byType.map((row) => <span key={row.type} className="rounded-full bg-muted px-3 py-1 text-sm capitalize">{row.type}: {row.units}</span>)}</div></section>}
    <section className="space-y-3"><div className="flex items-center gap-2"><DollarSign className="text-primary" /><h2 className="text-xl font-semibold">Transaction history</h2></div><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Date / release</th><th className="p-3">Status</th><th className="p-3">Fan payment</th><th className="p-3">Tax</th><th className="p-3">Artist share</th><th className="p-3">Processing fee</th><th className="p-3">Tunevio</th><th className="p-3">Action</th></tr></thead><tbody>{sales.map((sale: any) => <tr key={sale.id} className="border-t"><td className="p-3"><p className="font-medium">{sale.product_title}</p><p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</p></td><td className="p-3 capitalize">{sale.status}</td><td className="p-3">{formatUsd(sale.amount_cents)}</td><td className="p-3">{formatUsd(sale.tax_cents)}</td><td className="p-3">{formatUsd(sale.artist_cents)}</td><td className="p-3">{formatUsd(sale.fee_cents)}</td><td className="p-3">{formatUsd(sale.platform_cents)}</td><td className="p-3">{sale.status === "paid" && <Button size="sm" variant="outline" disabled={refundMutation.isPending} onClick={() => refundMutation.mutate(sale.id)}>Refund</Button>}</td></tr>)}</tbody></table>{!sales.length && <p className="p-6 text-center text-muted-foreground">Completed purchases will appear here.</p>}</div></section>
    {editor.open && <ProductEditor product={editor.product} catalog={data.catalog} open={editor.open} onClose={() => setEditor({ open: false })} onSaved={refresh} />}
  </div>;
}
