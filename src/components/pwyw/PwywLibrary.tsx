import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Play, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { createPwywDownload, listMyPwywPurchases } from "@/lib/pwyw.functions";
import { formatUsd } from "@/lib/pwyw";
import { SignedImg } from "@/components/ui/signed-img";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/lib/player-context";

export function PwywLibrary({ checkoutSession }: { checkoutSession?: string }) {
  const purchases = useQuery({
    queryKey: ["my-pwyw-purchases"],
    queryFn: () => listMyPwywPurchases(),
    refetchInterval: checkoutSession ? 3000 : false,
  });
  const download = useServerFn(createPwywDownload);
  const { play } = usePlayer();
  const [downloading, setDownloading] = useState("");
  const rows = purchases.data ?? [];

  async function downloadTrack(purchaseId: string, trackId: string) {
    setDownloading(`${purchaseId}:${trackId}`);
    try {
      const result = await download({ data: { purchaseId, trackId } });
      window.location.assign(result.url);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Download unavailable"); }
    finally { setDownloading(""); }
  }

  if (purchases.isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>;
  return <section className="space-y-5">
    {checkoutSession && <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><p className="font-semibold">Checkout received</p><p className="text-sm text-muted-foreground">Your music appears here after Tunevio verifies the signed payment confirmation. This page checks automatically.</p></div>}
    <div><h2 className="text-2xl font-bold">My Purchases</h2><p className="text-sm text-muted-foreground">Stream, download, and restore your purchased music without paying again.</p></div>
    {!rows.length && <div className="rounded-2xl border border-dashed p-10 text-center"><ReceiptText className="mx-auto mb-3 text-muted-foreground" /><p className="font-semibold">No music purchases yet</p><p className="mt-1 text-sm text-muted-foreground">Choose Your Price on a participating artist's Music Store.</p><Button asChild className="mt-5"><Link to="/music-store">Browse the Music Store</Link></Button></div>}
    {rows.map((purchase: any) => {
      const paid = purchase.status === "paid";
      const playable = purchase.tracks.filter((track: any) => track.audioUrl);
      return <article key={purchase.id} className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div><h3 className="text-lg font-semibold">{purchase.product_title}</h3><p className="text-sm capitalize text-muted-foreground">{purchase.product_type} · {purchase.tracks.length || purchase.track_ids.length} track{(purchase.track_ids.length === 1) ? "" : "s"}</p></div>
          <div className="text-right"><p className="font-semibold">{formatUsd(purchase.amount_cents)}</p><p className={`text-xs capitalize ${paid ? "text-primary" : "text-muted-foreground"}`}>{purchase.status}</p></div>
        </div>
        {paid && playable.length > 0 && <div className="p-3"><Button variant="outline" size="sm" onClick={() => playable[0] && play(playable[0], playable)}><Play className="fill-current" />Play purchase</Button></div>}
        <div className="divide-y">{purchase.tracks.map((track: any) => <div key={track.id} className="flex items-center gap-3 px-4 py-3">
          <SignedImg src={track.coverUrl} alt={`${track.title} artwork`} className="h-12 w-12 rounded-lg object-cover" />
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{track.title}</p><p className="truncate text-sm text-muted-foreground">{track.artist}</p></div>
          {track.audioUrl && <Button size="icon" variant="ghost" aria-label={`Play ${track.title}`} onClick={() => play(track, playable)}><Play /></Button>}
          <Button size="icon" variant="ghost" aria-label={`Download ${track.title}`} disabled={downloading === `${purchase.id}:${track.id}`} onClick={() => void downloadTrack(purchase.id, track.id)}>{downloading === `${purchase.id}:${track.id}` ? <Loader2 className="animate-spin" /> : <Download />}</Button>
        </div>)}</div>
        <details className="border-t px-4 py-3 text-sm"><summary className="cursor-pointer font-medium">Receipt & purchase history</summary><dl className="mt-3 grid grid-cols-2 gap-2 text-muted-foreground"><dt>Music</dt><dd className="text-right">{formatUsd(purchase.amount_cents)}</dd><dt>Tax</dt><dd className="text-right">{formatUsd(purchase.tax_cents)}</dd><dt>Total collected</dt><dd className="text-right">{purchase.total_collected_cents === null ? "Pending" : formatUsd(purchase.total_collected_cents)}</dd><dt>Purchased</dt><dd className="text-right">{new Date(purchase.created_at).toLocaleString()}</dd><dt>Reference</dt><dd className="truncate text-right font-mono text-xs">{purchase.stripe_session_id ?? purchase.id}</dd></dl></details>
      </article>;
    })}
  </section>;
}
