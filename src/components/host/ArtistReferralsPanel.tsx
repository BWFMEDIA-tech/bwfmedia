import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { getMyArtistReferrals } from "@/lib/artist-referrals.functions";

const fmt = (c: number) => `$${(Math.max(0, c) / 100).toFixed(2)}`;

export function ArtistReferralsPanel({ userId }: { userId: string }) {
  const fn = useServerFn(getMyArtistReferrals);
  const q = useQuery({ queryKey: ["my-artist-referrals", userId], queryFn: () => fn() });
  const [showQr, setShowQr] = useState(false);
  const d = q.data;
  if (!d) return null;
  if (!d.code) return null; // only hosts get a link
  const link = `https://tunevio.com/join/${d.code}`;
  const conv = d.clicks > 0 ? Math.round((d.referred / d.clicks) * 1000) / 10 : 0;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Join Tunevio", url: link }); } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(link); toast.success("Link copied"); }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Artist referrals</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {d.enabled
          ? `Earn ${d.percentage}% of every Tunevio membership payment from artists who join through your link. Kept separate from your room earnings.`
          : "The artist referral program is paused. Existing referrals stay linked to you."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs" />
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy className="h-4 w-4" />Copy</button>
          <button className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm" onClick={share}><Share2 className="h-4 w-4" />Share</button>
          <button className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm" onClick={() => setShowQr((v) => !v)}><QrCode className="h-4 w-4" />QR</button>
        </div>
      </div>
      {showQr && <div className="mt-3 inline-block rounded-xl bg-foreground p-3"><QRCodeSVG value={link} size={160} /></div>}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Referred artists" value={String(d.referred)} />
        <Stat label="Active artists" value={String(d.active)} />
        <Stat label="This month" value={fmt(d.monthly_cents)} />
        <Stat label="Lifetime" value={fmt(d.lifetime_cents)} />
        <Stat label="Link visits" value={String(d.clicks)} />
        <Stat label="Conversion" value={`${conv}%`} />
      </div>
      {d.artists.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {d.artists.map((a: any) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${a.active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{a.active ? "Active" : "Inactive"}</span>
              <span className="font-bold tabular-nums">{fmt(a.earned_cents)}</span>
            </li>
          ))}
        </ul>
      )}
      {d.commissions.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {d.commissions.slice(0, 50).map((c: any) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2 text-xs">
              <span className="min-w-0 flex-1 truncate">{new Date(c.created_at).toLocaleDateString()} · {c.artist_name} · {fmt(c.subscription_amount_cents)} × {Number(c.percentage)}%</span>
              <span className="uppercase text-muted-foreground">{c.status}</span>
              <span className="font-bold tabular-nums text-primary">{fmt(c.commission_cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
