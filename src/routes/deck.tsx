import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Play, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Layers,
  Globe, DollarSign, Swords, Rocket, LineChart, Target, Eye, Mail, ArrowLeft, Lock,
  ShieldCheck, Radio, ChevronRight,
} from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import grunge from "@/assets/grunge-bg.jpg";
import bwfLogo from "@/assets/tunevio-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getDeckContent } from "@/lib/deck-gate.functions";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "BWFMEDIA, Investor Pitch Deck" },
      { name: "description", content: "BWFMEDIA Inc. investor pitch deck. 687M+ views, 325K+ subscribers. Real Content. Real People. Real Reach." },
      { property: "og:title", content: "BWFMEDIA, Investor Pitch Deck" },
      { property: "og:description", content: "Real Content. Real People. Real Reach. Raising $500K–$1M to scale the #1 independent digital network for culture-driven content." },
    ],
  }),
  component: DeckPage,
});

/* ---------- shared slide shell ---------- */

function Slide({
  number,
  label,
  children,
  className = "",
}: {
  number: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative w-full min-h-screen overflow-hidden border-b border-border flex items-center ${className}`}
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.82), rgba(0,0,0,0.94)), url(${grunge})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-28 w-full">
        <div className="flex items-center justify-between mb-10">
          <span className="font-cond font-bold tracking-[0.4em] text-xs uppercase" style={{ color: "var(--blood)" }}>
            {number}, {label}
          </span>
          <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 hidden md:block">
            BWFMEDIA · PITCH DECK
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          {children}
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-5xl md:text-7xl leading-[0.95] text-bone mb-8">
      {children}
    </h2>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4 text-bone/85 font-cond text-lg md:text-xl leading-relaxed">
      <span className="mt-2 inline-block w-2 h-2 flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
      <span>{children}</span>
    </li>
  );
}

function StatCard({ big, label }: { big: string; label: string }) {
  return (
    <div className="border border-border bg-black/40 p-6 md:p-8">
      <div className="font-display text-4xl md:text-6xl leading-none red-shadow" style={{ color: "var(--blood)" }}>{big}</div>
      <div className="font-cond font-bold tracking-[0.3em] text-[10px] md:text-xs uppercase text-bone/70 mt-3">{label}</div>
    </div>
  );
}

/* ---------- nav ---------- */

function DeckNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur bg-black/70 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={bwfLogo.url} alt="BWF Media" className="w-8 h-8 object-contain" />
          <span className="font-display text-lg md:text-xl tracking-tight text-bone">
            BWF MEDIA <span style={{ color: "var(--blood)" }}>TV</span>
          </span>
        </Link>
        <span className="hidden md:block font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-bone/60">
          Investor Pitch Deck
        </span>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 font-cond font-bold tracking-[0.25em] text-[10px] md:text-[11px] uppercase text-bone border border-border hover:bg-white/5"
        >
          <ArrowLeft className="w-3 h-3" /> Site
        </Link>
      </div>
    </nav>
  );
}

/* ---------- slides (content delivered by the server after unlock) ---------- */

type DeckData = NonNullable<Awaited<ReturnType<typeof getDeckContent>>["content"]>;

/** Renders inline markup: **bold**, [[blood]], and \n line breaks. */
function Rich({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  text.split("\n").forEach((line, li) => {
    if (li > 0) out.push(<br key={`br${li}`} />);
    line.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g).forEach((seg, si) => {
      if (!seg) return;
      const k = `${li}-${si}`;
      if (seg.startsWith("**")) out.push(<span key={k} className="text-bone font-bold">{seg.slice(2, -2)}</span>);
      else if (seg.startsWith("[[")) out.push(<span key={k} className="font-bold" style={{ color: "var(--blood)" }}>{seg.slice(2, -2)}</span>);
      else out.push(seg);
    });
  });
  return <>{out}</>;
}

function Kicker({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; text: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Icon className="w-8 h-8" style={{ color: "var(--blood)" }} />
      <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">{text}</span>
    </div>
  );
}

function Quote({ text }: { text: string }) {
  return (
    <div className="mt-12 border-l-4 pl-6 py-2 max-w-3xl" style={{ borderColor: "var(--blood)" }}>
      <p className="font-cond text-lg md:text-xl text-bone/90 italic"><Rich text={text} /></p>
    </div>
  );
}

function Cover({ c }: { c: DeckData["cover"] }) {
  return (
    <section
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center pt-20"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.93)), url(${grunge})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--blood) 22%, transparent), transparent 60%)" }} />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="font-cond font-bold tracking-[0.5em] text-xs uppercase text-bone/60">{c.eyebrow}</span>
          <h1 className="mt-8 font-display text-7xl md:text-[9rem] leading-[0.9] text-bone">
            BWF<span style={{ color: "var(--blood)" }}>MEDIA</span>
            <br />INC.
            <span className="sr-only"> Investor Pitch Deck</span>
          </h1>
          <p className="mt-8 font-cond text-2xl md:text-3xl italic text-bone/80">{c.tagline}</p>
          <div className="mt-14 grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto">
            {c.stats.map((st) => <StatCard key={st.label} big={st.big} label={st.label} />)}
          </div>
          <div className="mt-12 font-cond font-bold tracking-[0.4em] text-xs uppercase text-bone/70">
            Founder · <span className="text-bone">{c.founder}</span>
          </div>
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

function Problem({ c }: { c: DeckData["problem"] }) {
  return (
    <Slide number="02" label="The Problem">
      <Kicker icon={AlertTriangle} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <p className="font-cond text-xl text-bone/75 max-w-2xl mb-10">{c.intro}</p>
      <ul className="space-y-5 max-w-2xl">{c.bullets.map((b) => <Bullet key={b}>{b}</Bullet>)}</ul>
      <Quote text={c.quote} />
    </Slide>
  );
}

function Solution({ c }: { c: DeckData["solution"] }) {
  return (
    <Slide number="03" label="The Solution">
      <Kicker icon={Lightbulb} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <div className="grid md:grid-cols-3 gap-4 mt-10">
        {c.cards.map((x) => (
          <div key={x.t} className="border border-border bg-black/40 p-6">
            <div className="font-display text-2xl text-bone mb-2">{x.t}</div>
            <div className="font-cond text-bone/70">{x.d}</div>
          </div>
        ))}
      </div>
      <Quote text={c.quote} />
    </Slide>
  );
}

function Traction({ c }: { c: DeckData["traction"] }) {
  return (
    <Slide number="04" label="Traction">
      <Kicker icon={TrendingUp} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
        {c.stats.map((st) => <StatCard key={st.label} big={st.big} label={st.label} />)}
      </div>
      <p className="mt-10 font-cond text-lg text-bone/80 max-w-3xl"><Rich text={c.note} /></p>
    </Slide>
  );
}

function Ecosystem({ c }: { c: DeckData["ecosystem"] }) {
  return (
    <Slide number="05" label="Product Ecosystem">
      <Kicker icon={Layers} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-4xl">
        {c.items.map((t) => (
          <div key={t} className="border border-border bg-black/40 p-5 flex items-center gap-4">
            <Play className="w-5 h-5 flex-shrink-0" style={{ color: "var(--blood)" }} />
            <span className="font-cond text-lg text-bone/90">{t}</span>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function Market({ c }: { c: DeckData["market"] }) {
  return (
    <Slide number="06" label="Market Opportunity">
      <Kicker icon={Globe} text={c.kicker} />
      <H>{c.title}</H>
      <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-4xl">
        {c.stats.map((st) => <StatCard key={st.label} big={st.big} label={st.label} />)}
      </div>
      <p className="mt-10 font-cond text-xl text-bone/85 max-w-3xl leading-relaxed"><Rich text={c.note} /></p>
    </Slide>
  );
}

function BusinessModel({ c }: { c: DeckData["business"] }) {
  return (
    <Slide number="07" label="Business Model">
      <Kicker icon={DollarSign} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-4xl">
        {c.cards.map((x) => (
          <div key={x.t} className="border border-border bg-black/40 p-5">
            <div className="font-display text-xl text-bone">{x.t}</div>
            <div className="font-cond text-bone/70 mt-1">{x.d}</div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function Competition({ c }: { c: DeckData["competition"] }) {
  return (
    <Slide number="08" label="Competitive Landscape">
      <Kicker icon={Swords} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {c.cards.map((x) => (
          <div key={x.t} className="border border-border bg-black/40 p-6 text-center">
            <div className="font-display text-3xl text-bone">{x.t}</div>
            <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 mt-2">{x.d}</div>
          </div>
        ))}
      </div>
      <div className="mt-12 border-l-4 pl-6 py-2 max-w-3xl" style={{ borderColor: "var(--blood)" }}>
        <p className="font-cond text-lg md:text-xl text-bone/90"><Rich text={c.quote} /></p>
      </div>
    </Slide>
  );
}

function Growth({ c }: { c: DeckData["growth"] }) {
  return (
    <Slide number="09" label="Growth Strategy">
      <Kicker icon={Rocket} text={c.kicker} />
      <H>{c.title}</H>
      <ul className="space-y-5 max-w-3xl mt-8">{c.bullets.map((b) => <Bullet key={b}>{b}</Bullet>)}</ul>
    </Slide>
  );
}

function Financials({ c }: { c: DeckData["financials"] }) {
  return (
    <Slide number="10" label="Financial Projections">
      <Kicker icon={LineChart} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {c.years.map((f) => (
          <div key={f.y} className="border border-border bg-black/40 p-6">
            <div className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/60">{f.y}</div>
            <div className="font-display text-3xl md:text-4xl mt-3 red-shadow" style={{ color: "var(--blood)" }}>{f.v}</div>
          </div>
        ))}
      </div>
      <p className="mt-10 font-cond text-lg text-bone/80 max-w-3xl">{c.note}</p>
    </Slide>
  );
}

function Ask({ c }: { c: DeckData["ask"] }) {
  return (
    <Slide number="11" label="The Ask">
      <Kicker icon={Target} text={c.kicker} />
      <H><Rich text={c.title} /></H>
      <div className="mt-8">
        <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60 mb-4">Use of funds</div>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
          {c.uses.map((t) => (
            <div key={t} className="border border-border bg-black/40 p-5 flex items-center gap-4">
              <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
              <span className="font-cond text-lg text-bone/90">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

function Vision({ c }: { c: DeckData["vision"] }) {
  return (
    <Slide number="12" label="Vision">
      <Kicker icon={Eye} text={c.kicker} />
      <h2 className="font-display text-4xl md:text-6xl leading-[1.05] text-bone max-w-4xl"><Rich text={c.quote} /></h2>
    </Slide>
  );
}

function Closing({ c }: { c: DeckData["closing"] }) {
  return (
    <section
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.82), rgba(0,0,0,0.95)), url(${grunge})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--blood) 25%, transparent), transparent 60%)" }} />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <span className="font-cond font-bold tracking-[0.5em] text-xs uppercase text-bone/60">Thank You</span>
          <h2 className="mt-8 font-display text-6xl md:text-8xl leading-[0.95] text-bone">
            Let's build the<br />
            <span style={{ color: "var(--blood)" }}>future of culture.</span>
          </h2>
          <p className="mt-8 font-cond text-xl text-bone/80">
            Founder · <span className="text-bone font-bold">{c.founder}</span>
          </p>
          <a
            href={`mailto:${c.email}`}
            className="inline-flex items-center gap-3 mt-10 px-8 py-4 font-cond font-bold tracking-[0.3em] text-sm uppercase text-bone"
            style={{ backgroundColor: "var(--blood)" }}
          >
            <Mail className="w-4 h-4" /> Contact for Investment
          </a>
          <div className="mt-12 grid grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto">
            {c.stats.map((st) => <StatCard key={st.label} big={st.big} label={st.label} />)}
          </div>
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

function DeckPage() {
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("deck_lead_captured") === "1") {
      setLeadCaptured(true);
    }
    setChecked(true);
  }, []);

  if (!checked) return <main className="bg-black min-h-screen" />;
  if (!leadCaptured) return <DeckLeadForm onSubmitted={() => setLeadCaptured(true)} />;
  if (!deck) return <DeckGate onUnlock={setDeck} />;

  return (
    <main className="bg-black min-h-screen">
      <DeckNav />
      <Cover c={deck.cover} />
      <Problem c={deck.problem} />
      <Solution c={deck.solution} />
      <Traction c={deck.traction} />
      <Ecosystem c={deck.ecosystem} />
      <Market c={deck.market} />
      <BusinessModel c={deck.business} />
      <Competition c={deck.competition} />
      <Growth c={deck.growth} />
      <Financials c={deck.financials} />
      <Ask c={deck.ask} />
      <Vision c={deck.vision} />
      <Closing c={deck.closing} />
    </main>
  );
}

const INVESTOR_TYPES = [
  "Angel investor",
  "Brand partner",
  "Media company",
  "Private investor",
  "Just exploring",
];

const INVESTMENT_RANGES = [
  "$1K – $10K",
  "$10K – $50K",
  "$50K – $250K",
  "$250K+",
  "Not investing yet (just learning)",
];

const HUD_GOLD = "#D4A24C";

function HudAtmosphere() {
  return (
    <>
      {/* base black */}
      <div className="absolute inset-0 -z-30 bg-black" />
      {/* animated grid */}
      <div
        className="absolute inset-0 -z-20 opacity-[0.18]"
        style={{
          backgroundImage: `linear-gradient(${HUD_GOLD}55 1px, transparent 1px), linear-gradient(90deg, ${HUD_GOLD}55 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          animation: "hud-grid-pan 18s linear infinite",
        }}
      />
      {/* radial glow */}
      <div
        className="absolute inset-0 -z-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${HUD_GOLD}33 0%, transparent 55%)`,
        }}
      />
      {/* scanlines */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-[0.08] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />
      {/* moving scan line */}
      <div
        className="absolute left-0 right-0 -z-10 h-[2px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${HUD_GOLD}, transparent)`,
          boxShadow: `0 0 24px ${HUD_GOLD}`,
          animation: "hud-scan 6s linear infinite",
        }}
      />
      <style>{`
        @keyframes hud-grid-pan {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 44px 44px, 44px 44px; }
        }
        @keyframes hud-scan {
          0% { top: -2%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 102%; opacity: 0; }
        }
        @keyframes hud-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

function HudFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative bg-black/80 backdrop-blur-sm"
      style={{
        border: `1px solid ${HUD_GOLD}66`,
        boxShadow: `0 0 0 1px #00000080 inset, 0 30px 80px -20px ${HUD_GOLD}44, 0 0 60px -20px ${HUD_GOLD}66`,
      }}
    >
      {/* corner ticks */}
      {[
        "top-0 left-0 border-t-2 border-l-2",
        "top-0 right-0 border-t-2 border-r-2",
        "bottom-0 left-0 border-b-2 border-l-2",
        "bottom-0 right-0 border-b-2 border-r-2",
      ].map((c) => (
        <span key={c} className={`absolute w-4 h-4 ${c}`} style={{ borderColor: HUD_GOLD }} />
      ))}
      {/* top channel labels */}
      <div
        className="absolute -top-3 left-6 px-2 font-mono text-[9px] tracking-[0.35em] uppercase"
        style={{ background: "#000", color: HUD_GOLD }}
      >
        CH-01 // SECURE
      </div>
      <div
        className="absolute -top-3 right-6 px-2 font-mono text-[9px] tracking-[0.35em] uppercase flex items-center gap-1.5"
        style={{ background: "#000", color: HUD_GOLD }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: HUD_GOLD, animation: "hud-pulse 1.6s ease-in-out infinite" }}
        />
        LIVE LINK
      </div>
      {children}
    </div>
  );
}

const hudFieldClass =
  "w-full bg-black border text-bone font-mono text-sm tracking-wider px-4 py-3 outline-none transition-colors placeholder:text-bone/25";
const hudFieldStyle = { borderColor: `${HUD_GOLD}55` } as const;
const hudFieldFocus = "focus:border-[var(--hud-gold)]";

function HudLabel({ children, code }: { children: React.ReactNode; code: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: HUD_GOLD }}>
        {children}
      </label>
      <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-bone/30">{code}</span>
    </div>
  );
}

function DeckLeadForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [investorType, setInvestorType] = useState("");
  const [investmentRange, setInvestmentRange] = useState("");
  const [company, setCompany] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const name = fullName.trim();
    const mail = email.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2 || name.length > 120) return setError("Please enter your full name.");
    if (!emailRe.test(mail) || mail.length > 255) return setError("Please enter a valid email.");
    if (!investorType) return setError("Select an investor type.");
    if (!investmentRange) return setError("Select an investment range.");

    setSubmitting(true);
    const { error: insertError } = await supabase.from("deck_leads").insert({
      full_name: name,
      email: mail,
      investor_type: investorType,
      investment_range: investmentRange,
      company: company.trim() ? company.trim().slice(0, 200) : null,
      website_or_linkedin: link.trim() ? link.trim().slice(0, 300) : null,
    });
    setSubmitting(false);

    if (insertError) {
      setError("Something went wrong. Please try again.");
      return;
    }

    sessionStorage.setItem("deck_lead_captured", "1");
    onSubmitted();
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center py-20">
      <HudAtmosphere />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl mx-auto px-6"
      >
        {/* Top status bar */}
        <div className="flex items-center justify-between mb-4 font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: HUD_GOLD }}>
          <div className="flex items-center gap-2">
            <Radio className="w-3 h-3" />
            <span>BWF MEDIA TV</span>
          </div>
          <div className="flex items-center gap-2 text-bone/50">
            <span className="hidden sm:inline">Private &amp; Confidential</span>
          </div>
        </div>

        <HudFrame>
          <div className="p-8 md:p-10">
            <div className="flex items-center justify-center mb-6">
              <div
                className="relative p-3"
                style={{ border: `1px solid ${HUD_GOLD}66`, boxShadow: `0 0 30px ${HUD_GOLD}55` }}
              >
                <img src={bwfLogo.url} alt="BWF Media" className="w-10 h-10 object-contain" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: HUD_GOLD }} />
              <span className="font-mono text-[10px] tracking-[0.5em] uppercase" style={{ color: HUD_GOLD }}>
                Identity Required
              </span>
            </div>
            <h1 className="text-center font-display text-3xl md:text-5xl text-bone leading-[0.95] uppercase">
              Investor <span style={{ color: HUD_GOLD, textShadow: `0 0 20px ${HUD_GOLD}88` }}>Access</span>
            </h1>
            <p className="mt-4 text-center font-mono text-[11px] tracking-[0.25em] uppercase text-bone/55">
              Enter your details to access the pitch deck.
            </p>

            <form onSubmit={submit} className="mt-10 space-y-5">
              <div>
                <HudLabel code="ID-001">Full Name *</HudLabel>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="First and last"
                  maxLength={120}
                  className={hudFieldClass}
                  style={hudFieldStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = HUD_GOLD)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `${HUD_GOLD}55`)}
                />
              </div>

              <div>
                <HudLabel code="ID-002">Email *</HudLabel>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                  className={hudFieldClass}
                  style={hudFieldStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = HUD_GOLD)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `${HUD_GOLD}55`)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <HudLabel code="CLS-01">Investor Type *</HudLabel>
                  <select
                    value={investorType}
                    onChange={(e) => setInvestorType(e.target.value)}
                    className={hudFieldClass}
                    style={hudFieldStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = HUD_GOLD)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = `${HUD_GOLD}55`)}
                  >
                    <option value="">- Select -</option>
                    {INVESTOR_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <HudLabel code="CAP-01">Investment Range *</HudLabel>
                  <select
                    value={investmentRange}
                    onChange={(e) => setInvestmentRange(e.target.value)}
                    className={hudFieldClass}
                    style={hudFieldStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = HUD_GOLD)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = `${HUD_GOLD}55`)}
                  >
                    <option value="">- Select -</option>
                    {INVESTMENT_RANGES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <HudLabel code="ORG-01">Company / Organization</HudLabel>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Optional"
                  maxLength={200}
                  className={hudFieldClass}
                  style={hudFieldStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = HUD_GOLD)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `${HUD_GOLD}55`)}
                />
              </div>

              <div>
                <HudLabel code="REF-01">Website or LinkedIn</HudLabel>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Optional"
                  maxLength={300}
                  className={hudFieldClass}
                  style={hudFieldStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = HUD_GOLD)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `${HUD_GOLD}55`)}
                />
              </div>

              {error && (
                <div
                  className="font-mono text-xs tracking-wider px-3 py-2 border"
                  style={{ color: "var(--blood)", borderColor: "var(--blood)", background: "rgba(0,0,0,0.6)" }}
                >
                  {`!! ERROR: ${error}`}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full px-6 py-4 font-mono font-bold tracking-[0.4em] text-xs uppercase text-black disabled:opacity-60 transition-all"
                style={{
                  background: HUD_GOLD,
                  boxShadow: `0 0 0 1px ${HUD_GOLD}, 0 0 30px ${HUD_GOLD}88`,
                }}
              >
                <span className="inline-flex items-center justify-center gap-3">
                  {submitting ? "Transmitting..." : "Authorize & Continue"}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between font-mono text-[10px] tracking-[0.3em] uppercase">
              <Link to="/" className="inline-flex items-center gap-2 text-bone/50 hover:text-bone transition-colors">
                <ArrowLeft className="w-3 h-3" /> Abort
              </Link>
              <span style={{ color: HUD_GOLD }} className="opacity-70">STEP 01 / 02</span>
            </div>
          </div>
        </HudFrame>

        <p className="mt-6 text-center font-mono text-[10px] tracking-[0.4em] uppercase text-bone/35">
          BWFMEDIA · Private &amp; Confidential · Do Not Distribute
        </p>
      </motion.div>
    </main>
  );
}

function DeckGate({ onUnlock }: { onUnlock: (d: DeckData) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const verify = useServerFn(getDeckContent);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await verify({ data: { password: pw } });
      if (res.ok && res.content) {
        onUnlock(res.content);
      } else {
        setError("Incorrect password.");
      }
    } catch {
      setError("Could not verify. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center py-20">
      <HudAtmosphere />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-auto px-6"
      >
        <div className="flex items-center justify-between mb-4 font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: HUD_GOLD }}>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3" />
            <span>VAULT // SEALED</span>
          </div>
          <span className="text-bone/50">STEP 02 / 02</span>
        </div>

        <HudFrame>
          <div className="p-8 md:p-10">
            <div className="flex items-center justify-center mb-6">
              <div
                className="relative p-3"
                style={{ border: `1px solid ${HUD_GOLD}66`, boxShadow: `0 0 30px ${HUD_GOLD}55` }}
              >
                <img src={bwfLogo.url} alt="BWF Media" className="w-10 h-10 object-contain" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5" style={{ color: HUD_GOLD }} />
              <span className="font-mono text-[10px] tracking-[0.5em] uppercase" style={{ color: HUD_GOLD }}>
                Passphrase Required
              </span>
            </div>
            <h2 className="text-center font-display text-3xl md:text-5xl text-bone leading-[0.95] uppercase">
              Decrypt <span style={{ color: HUD_GOLD, textShadow: `0 0 20px ${HUD_GOLD}88` }}>Deck</span>
            </h2>
            <p className="mt-4 text-center font-mono text-[11px] tracking-[0.25em] uppercase text-bone/55">
              Enter your access key to view the deck.
            </p>

            <form onSubmit={submit} className="mt-10 space-y-5">
              <div>
                <HudLabel code="KEY-01">Access Key</HudLabel>
                <input
                  type="password"
                  autoFocus
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setError(""); }}
                  placeholder="••••••••••••"
                  className={`${hudFieldClass} tracking-[0.5em]`}
                  style={hudFieldStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = HUD_GOLD)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = `${HUD_GOLD}55`)}
                />
              </div>

              {error && (
                <div
                  className="font-mono text-xs tracking-wider px-3 py-2 border"
                  style={{ color: "var(--blood)", borderColor: "var(--blood)", background: "rgba(0,0,0,0.6)" }}
                >
                  {`!! ACCESS DENIED: ${error}`}
                </div>
              )}

              <button
                type="submit"
                className="group relative w-full px-6 py-4 font-mono font-bold tracking-[0.4em] text-xs uppercase text-black transition-all"
                style={{
                  background: HUD_GOLD,
                  boxShadow: `0 0 0 1px ${HUD_GOLD}, 0 0 30px ${HUD_GOLD}88`,
                }}
              >
                <span className="inline-flex items-center justify-center gap-3">
                  Unlock Deck
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between font-mono text-[10px] tracking-[0.3em] uppercase">
              <Link to="/" className="inline-flex items-center gap-2 text-bone/50 hover:text-bone transition-colors">
                <ArrowLeft className="w-3 h-3" /> Abort
              </Link>
              <span style={{ color: HUD_GOLD }} className="opacity-70 inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: HUD_GOLD, animation: "hud-pulse 1.6s ease-in-out infinite" }}
                />
                READY
              </span>
            </div>
          </div>
        </HudFrame>

        <p className="mt-6 text-center font-mono text-[10px] tracking-[0.4em] uppercase text-bone/35">
          BWFMEDIA · Private &amp; Confidential
        </p>
      </motion.div>
    </main>
  );
}