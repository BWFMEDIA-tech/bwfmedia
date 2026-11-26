import { useId } from "react";
import { Check, Info, Music } from "lucide-react";
import { SignedImg } from "@/components/ui/signed-img";
import { CERT_LEVELS, compactStreams, milestoneProgress } from "@/lib/certifications";

type Cert = { level: string; status: string; achieved_at: string; eligible_streams_at_issue: number; note: string | null };
export type CertDashboardData = { profile: { display_name?: string | null; stage_name?: string | null; avatar_url?: string | null }; streams: number; certifications: Cert[] };

const MEDAL: Record<string, string> = { bronze: "var(--cert-bronze)", silver: "var(--cert-silver)", gold: "var(--cert-gold)", platinum: "#9ca3af", diamond: "var(--cert-diamond)" };

// Faceted brilliant-cut diamond: flat table, angled crown facets, pointed pavilion.
function DiamondGem({ size = 64 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const body = `dg-body-${uid}`;
  const face = `dg-face-${uid}`;
  const sheen = `dg-sheen-${uid}`;
  return (
    <svg viewBox="0 0 100 84" width={size} height={size * 0.84} aria-hidden style={{ filter: "drop-shadow(0 0 8px rgba(0,230,255,.35))" }}>
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eafcff" />
          <stop offset="0.45" stopColor="#5fe4ff" />
          <stop offset="1" stopColor="#0a58c9" />
        </linearGradient>
        <linearGradient id={face} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#9beeff" />
          <stop offset="1" stopColor="#2b8fe0" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* crown */}
      <polygon points="30,10 5,32 37,32" fill={`url(#${body})`} />
      <polygon points="70,10 95,32 63,32" fill={`url(#${body})`} />
      <polygon points="30,10 70,10 63,32 37,32" fill={`url(#${face})`} />
      <polygon points="30,10 70,10 63,32 37,32" fill={`url(#${sheen})`} opacity="0.45" />
      {/* pavilion */}
      <polygon points="5,32 27,32 50,80" fill={`url(#${body})`} opacity="0.82" />
      <polygon points="27,32 50,32 50,80" fill={`url(#${face})`} opacity="0.9" />
      <polygon points="50,32 73,32 50,80" fill={`url(#${body})`} opacity="0.95" />
      <polygon points="73,32 95,32 50,80" fill={`url(#${face})`} opacity="0.7" />
      {/* facet etching */}
      <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" fill="none">
        <path d="M30 10 5 32M30 10 37 32M70 10 63 32M70 10 95 32M5 32h90M27 32 50 80M50 32V80M73 32 50 80" />
      </g>
      <polygon points="30,10 70,10 63,32 37,32" fill="none" stroke="#eafcff" strokeOpacity="0.7" strokeWidth="1" />
      {/* sparkle */}
      <path d="M17 6 18.6 11 23.6 12.6 18.6 14.2 17 19.2 15.4 14.2 10.4 12.6 15.4 11Z" fill="#ffffff" opacity="0.85" />
      <path d="M88 16 89.2 19.4 92.6 20.6 89.2 21.8 88 25.2 86.8 21.8 83.4 20.6 86.8 19.4Z" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}

function Medal({ level, size = 64 }: { level: string; size?: number }) {
  if (level === "diamond") return <DiamondGem size={size} />;
  const c = MEDAL[level];
  return <div aria-hidden className="relative rounded-full" style={{ width: size, height: size, background: `repeating-radial-gradient(circle, #0000 0 2px, #0003 2px 3px), radial-gradient(circle at 35% 30%, #fff9, ${c} 45%, #0008 120%)`, boxShadow: "inset 0 0 10px #0007" }}>
    <span className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 20deg, #fff5, transparent 22%, #fff3 50%, transparent 72%, #fff5)" }} />
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background/40" style={{ width: size * 0.34, height: size * 0.34, background: `radial-gradient(circle, ${c}, #0006)` }} />
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" style={{ width: Math.max(3, size * 0.07), height: Math.max(3, size * 0.07) }} />
  </div>;
}

export function CertificationDashboard({ data }: { data: CertDashboardData }) {
  const { streams } = data;
  const { next, percent, remaining } = milestoneProgress(streams);
  const issued = new Map(data.certifications.filter((c) => c.status === "issued").map((c) => [c.level, c]));
  const name = data.profile.stage_name || data.profile.display_name || "Artist";
  const r = 120, circ = 2 * Math.PI * r;
  return (
    <div className="cert-page space-y-5 text-foreground">
      <header className="flex flex-wrap items-center gap-5">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
          {data.profile.avatar_url && <SignedImg src={data.profile.avatar_url} alt={name} displayWidth={160} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold md:text-4xl">{next ? <>You're <span className="cert-gold">almost</span> there!</> : <>You reached <span className="cert-gold">Diamond</span>!</>}</h1>
          <p className="mt-1 text-muted-foreground">Keep sharing your music and you'll hit your next milestone soon.</p>
        </div>
        <div className="cert-panel flex items-center gap-2 px-5 py-3 text-sm"><Music className="h-4 w-4 text-muted-foreground" /> All-Time Streams</div>
      </header>

      <section className="cert-panel grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div>
          <div className="mb-3"><div className="text-lg font-semibold">{name}</div><div className="text-sm text-muted-foreground">Artist</div></div>
          <div className="relative mx-auto h-64 w-64">
            <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90">
              <circle cx="140" cy="140" r={r} fill="none" stroke="#333" strokeWidth="10" />
              <circle cx="140" cy="140" r={r} fill="none" stroke="var(--cert-gold)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - percent / 100)} />
            </svg>
            <div className="absolute inset-0 grid place-content-center text-center">
              <div className="cert-gold text-6xl font-bold">{percent}%</div>
              <div className="text-2xl font-semibold">{next ? `to ${next.label}` : "Complete"}</div>
              <div className="text-sm text-muted-foreground">Keep going! 🚀</div>
            </div>
          </div>
        </div>
        <div>
          <div className="text-sm uppercase tracking-wider text-muted-foreground">Current total</div>
          <div className="mt-2 text-5xl font-bold">{streams.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">streams</span></div>
          {next && <p className="mt-3 text-lg"><span className="cert-gold font-semibold">{remaining.toLocaleString()}</span> more streams to <span className="cert-gold">{next.label}</span></p>}
          <div className="mt-6 h-6 rounded-full bg-muted"><div className="cert-bar h-6 rounded-full" style={{ width: `${percent}%` }} /></div>
          <div className="mt-3 flex justify-between text-muted-foreground"><span><b className="text-foreground">{compactStreams(streams)}</b><br />current</span>{next && <span className="text-right"><b className="text-foreground">{compactStreams(next.threshold)}</b><br />to {next.label}</span>}</div>
        </div>
        {next && <div className="cert-panel flex flex-col items-center gap-2 px-8 py-6 text-center">
          <div className="cert-gold text-sm uppercase tracking-wider">Next milestone</div>
          <Medal level={next.key} size={96} />
          <div className="text-2xl font-bold uppercase" style={{ color: MEDAL[next.key] }}>{next.label}</div>
          <div className="text-xl">{next.threshold.toLocaleString()}</div><div className="text-sm text-muted-foreground">streams</div>
        </div>}
      </section>

      <section className="cert-panel p-5">
        <h2 className="mb-4 text-sm uppercase tracking-wider">Your milestone path</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 pt-4">
          {CERT_LEVELS.map((l) => {
            const cert = issued.get(l.key);
            const isNext = next?.key === l.key;
            const pct = Math.min(100, Math.floor((streams / l.threshold) * 100));
            return <div key={l.key} className={`cert-panel relative min-w-[170px] flex-1 p-4 text-center ${isNext ? "cert-next" : ""}`}>
              {isNext && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md px-3 py-0.5 text-xs font-bold text-background" style={{ background: "var(--cert-gold)" }}>NEXT</span>}
              {cert && <Check className="cert-gold absolute right-3 top-3 h-5 w-5 rounded-full border" style={{ borderColor: "var(--cert-gold)" }} />}
              <div className="flex justify-center"><Medal level={l.key} /></div>
              <div className="mt-2 font-semibold uppercase" style={{ color: MEDAL[l.key] }}>{l.label}</div>
              <div>{l.threshold.toLocaleString()}</div><div className="text-sm text-muted-foreground">streams</div>
              <div className="my-3 h-1 rounded bg-muted"><div className="cert-bar h-1 rounded" style={{ width: `${cert ? 100 : pct}%` }} /></div>
              <div className="text-sm" style={cert ? { color: "var(--cert-ok)" } : undefined}>{cert ? "ACHIEVED" : isNext ? <span className="cert-gold">{pct}%</span> : `${100 - pct}% to go`}</div>
              {cert && <div className="mt-1 text-xs text-muted-foreground">{new Date(cert.achieved_at).toLocaleDateString()}</div>}
            </div>;
          })}
        </div>
      </section>

      <div className="cert-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Stream counts use verified Tunevio streams. Milestones are awarded after Tunevio review.</p>
      </div>
    </div>
  );
}
