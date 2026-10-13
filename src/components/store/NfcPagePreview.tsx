import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Film, Play } from "lucide-react";
import type { PageTab } from "@/lib/nfc-pages";

export type PreviewTab = PageTab & { coverUrl: string | null; imageUrls: string[]; tracks: any[]; video: { id: string; title: string } | null };

/** Phone-style NFC page used both as the builder preview and the public tap page. */
export function NfcPagePreview({ name, tabs, artistName, full }: { name: string; tabs: PreviewTab[]; artistName?: string | null; full?: boolean }) {
  const [i, setI] = useState(0);
  const t = tabs[Math.min(i, tabs.length - 1)];
  return (
    <div className={`flex flex-col overflow-hidden border border-foreground/70 bg-background ${full ? "min-h-[100dvh]" : "aspect-[9/16] rounded-2xl"}`}>
      {tabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
          {tabs.map((x, n) => <button key={x.id} onClick={() => setI(n)} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${n === i ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{x.title}</button>)}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!t ? <div className="grid h-full place-items-center text-sm font-bold uppercase tracking-widest text-muted-foreground">Preview</div> : t.type === "music" ? (
          <div>
            <KeychainCover src={t.coverUrl} />
            <div className="space-y-1 p-4">
              <h2 className="text-xl font-bold">{t.subtitle || name}</h2>
              <p className="text-sm text-primary">{t.artist || artistName}</p>
              {t.date && <p className="text-xs text-muted-foreground">{t.date}</p>}
              {t.description && <p className="whitespace-pre-line pt-2 text-sm text-muted-foreground">{t.description}</p>}
            </div>
            <div className="space-y-2 px-4 pb-4">
              {t.tracks.map((tr) => (
                <div key={tr.id} className="border border-border p-2">
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Play className="h-3 w-3 text-primary" /> {tr.title}</div>
                  {full && tr.audio_url && <audio controls preload="none" src={tr.audio_url} className="w-full" />}
                </div>
              ))}
            </div>
          </div>
        ) : t.type === "video" ? (
          <div className="p-4">
            <h2 className="text-xl font-bold">{t.subtitle || t.title}</h2>
            {t.video ? (
              full ? <Link to="/videos/$id" params={{ id: t.video.id }} className="mt-4 grid aspect-video place-items-center border border-border bg-card text-sm font-semibold"><span className="flex items-center gap-2"><Film className="h-5 w-5 text-primary" /> Watch “{t.video.title}”</span></Link>
                : <div className="mt-4 grid aspect-video place-items-center border border-border bg-card text-xs"><Film className="h-5 w-5 text-primary" /> {t.video.title}</div>
            ) : <p className="mt-4 text-sm text-muted-foreground">No video chosen yet.</p>}
          </div>
        ) : (
          <div>
            <div className="relative aspect-[4/3] bg-gradient-to-br from-muted via-secondary to-foreground/40">
              {t.imageUrls[0] && <img src={t.imageUrls[0]} alt="" className="h-full w-full object-cover" />}
              <span className="absolute left-3 top-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-foreground"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Authentic</span>
            </div>
            <div className="p-4">
              <h2 className="border-b border-border pb-2 text-xl font-bold">{t.subtitle || "Title"}</h2>
              {t.artist && <p className="mt-2 text-sm text-primary">{t.artist}</p>}
              {t.description && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{t.description}</p>}
              {t.imageUrls.length > 1 && <div className="mt-3 grid grid-cols-3 gap-1">{t.imageUrls.slice(1).map((u) => <img key={u} src={u} alt="" className="aspect-square object-cover" />)}</div>}
            </div>
          </div>
        )}
      </div>
      <p className="py-2 text-center text-[9px] uppercase tracking-widest text-muted-foreground">Powered by Tunevio</p>
    </div>
  );
}
