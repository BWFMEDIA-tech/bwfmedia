import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Play, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Layers,
  Globe, DollarSign, Swords, Rocket, LineChart, Target, Eye, Mail, ArrowLeft,
} from "lucide-react";
import grunge from "@/assets/grunge-bg.jpg";
import bwfLogo from "@/assets/bwf-logo.jpg";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "BWFMEDIA — Investor Pitch Deck" },
      { name: "description", content: "BWFMEDIA Inc. investor pitch deck. 687M+ views, 325K+ subscribers. Real Content. Real People. Real Reach." },
      { property: "og:title", content: "BWFMEDIA — Investor Pitch Deck" },
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
            {number} — {label}
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
          <img src={bwfLogo} alt="BWF Media" className="w-8 h-8 object-contain" />
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

/* ---------- slides ---------- */

function Cover() {
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
          <span className="font-cond font-bold tracking-[0.5em] text-xs uppercase text-bone/60">Investor Pitch Deck · 2026</span>
          <h1 className="mt-8 font-display text-7xl md:text-[9rem] leading-[0.9] text-bone">
            BWF<span style={{ color: "var(--blood)" }}>MEDIA</span>
            <br />INC.
          </h1>
          <p className="mt-8 font-cond text-2xl md:text-3xl italic text-bone/80">
            "Real Content. Real People. Real Reach."
          </p>
          <div className="mt-14 grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto">
            <StatCard big="687M+" label="Views" />
            <StatCard big="325K+" label="Subscribers" />
            <StatCard big="18M+" label="Likes" />
          </div>
          <div className="mt-12 font-cond font-bold tracking-[0.4em] text-xs uppercase text-bone/70">
            Founder · <span className="text-bone">Dantavious Lee</span>
          </div>
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

function Problem() {
  return (
    <Slide number="02" label="The Problem">
      <div className="flex items-center gap-4 mb-6">
        <AlertTriangle className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">Independent creators are stuck</span>
      </div>
      <H>Creators don't own<br />their reach.</H>
      <p className="font-cond text-xl text-bone/75 max-w-2xl mb-10">
        Independent artists and culture creators struggle with three core problems:
      </p>
      <ul className="space-y-5 max-w-2xl">
        <Bullet>Distribution beyond social media</Bullet>
        <Bullet>Monetization control over their own content</Bullet>
        <Bullet>Exposure without signing to a label</Bullet>
      </ul>
      <div className="mt-12 border-l-4 pl-6 py-2 max-w-3xl" style={{ borderColor: "var(--blood)" }}>
        <p className="font-cond text-lg md:text-xl text-bone/90 italic">
          Platforms like YouTube prioritize <span className="text-bone font-bold">algorithms</span>, not <span className="text-bone font-bold">ownership</span>.
        </p>
      </div>
    </Slide>
  );
}

function Solution() {
  return (
    <Slide number="03" label="The Solution">
      <div className="flex items-center gap-4 mb-6">
        <Lightbulb className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">A vertically integrated network</span>
      </div>
      <H>Content + Distribution<br />+ Monetization.</H>
      <div className="grid md:grid-cols-3 gap-4 mt-10">
        {[
          { t: "Viral Media Platform", d: "Short-form, music, culture, virality." },
          { t: "Interview + Promo Engine", d: "Direct artist exposure & promotion." },
          { t: "BWFMEDIA TV", d: "Streaming network for culture content." },
        ].map((s) => (
          <div key={s.t} className="border border-border bg-black/40 p-6">
            <div className="font-display text-2xl text-bone mb-2">{s.t}</div>
            <div className="font-cond text-bone/70">{s.d}</div>
          </div>
        ))}
      </div>
      <div className="mt-12 border-l-4 pl-6 py-2 max-w-3xl" style={{ borderColor: "var(--blood)" }}>
        <p className="font-cond text-lg md:text-xl text-bone/90 italic">
          Think: an <span className="text-bone font-bold">independent Netflix + Tubi</span> for culture-driven content.
        </p>
      </div>
    </Slide>
  );
}

function Traction() {
  return (
    <Slide number="04" label="Traction">
      <div className="flex items-center gap-4 mb-6">
        <TrendingUp className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">Demand is already validated</span>
      </div>
      <H>The audience<br />is already here.</H>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
        <StatCard big="687.2M" label="Total Views" />
        <StatCard big="325,003" label="Subscribers" />
        <StatCard big="18.0M" label="Likes" />
        <StatCard big="2.8M" label="Views (Last 7 Days)" />
        <StatCard big="761K+" label="Comments" />
        <StatCard big="2.9M" label="Shares" />
      </div>
      <p className="mt-10 font-cond text-lg text-bone/80 max-w-3xl">
        These aren't projections — this is a <span className="text-bone font-bold">live, engaged audience</span> we already command across YouTube, Instagram, TikTok and short-form networks.
      </p>
    </Slide>
  );
}

function Ecosystem() {
  return (
    <Slide number="05" label="Product Ecosystem">
      <div className="flex items-center gap-4 mb-6">
        <Layers className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">One brand, many surfaces</span>
      </div>
      <H>The full BWFMEDIA<br />platform.</H>
      <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-4xl">
        {[
          "YouTube + Social Channels",
          "Roku Streaming Channel",
          "Original Shows & Interviews",
          "Music Video Distribution",
          "Advertising & Marketing Services",
          "BWFMEDIA TV Network",
        ].map((t) => (
          <div key={t} className="border border-border bg-black/40 p-5 flex items-center gap-4">
            <Play className="w-5 h-5 flex-shrink-0" style={{ color: "var(--blood)" }} />
            <span className="font-cond text-lg text-bone/90">{t}</span>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function Market() {
  return (
    <Slide number="06" label="Market Opportunity">
      <div className="flex items-center gap-4 mb-6">
        <Globe className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">A massive, accelerating market</span>
      </div>
      <H>$600B+ in motion.</H>
      <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-4xl">
        <StatCard big="$100B+" label="Creator Economy" />
        <StatCard big="$500B+" label="Streaming Industry" />
      </div>
      <p className="mt-10 font-cond text-xl text-bone/85 max-w-3xl leading-relaxed">
        Independent creators are <span className="text-bone font-bold">shifting away from labels</span> and toward direct monetization. BWFMEDIA sits at the intersection of both waves.
      </p>
    </Slide>
  );
}

function BusinessModel() {
  return (
    <Slide number="07" label="Business Model">
      <div className="flex items-center gap-4 mb-6">
        <DollarSign className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">Multiple revenue streams</span>
      </div>
      <H>Six ways we<br />make money.</H>
      <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-4xl">
        {[
          { t: "Paid Interviews", d: "$500+ per booking." },
          { t: "Artist Promo Packages", d: "Tiered $400 – $3,000." },
          { t: "Ad Revenue", d: "YouTube + streaming network." },
          { t: "Brand Partnerships", d: "Sponsorships & integrations." },
          { t: "Subscription Model", d: "Future recurring tier." },
          { t: "Content Licensing", d: "Resell archive & IP." },
        ].map((s) => (
          <div key={s.t} className="border border-border bg-black/40 p-5">
            <div className="font-display text-xl text-bone">{s.t}</div>
            <div className="font-cond text-bone/70 mt-1">{s.d}</div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function Competition() {
  return (
    <Slide number="08" label="Competitive Landscape">
      <div className="flex items-center gap-4 mb-6">
        <Swords className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">We compete across categories</span>
      </div>
      <H>Nobody combines<br />all three.</H>
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {[
          { t: "YouTube", d: "Distribution" },
          { t: "Netflix", d: "Content" },
          { t: "Tubi", d: "Free Streaming" },
        ].map((c) => (
          <div key={c.t} className="border border-border bg-black/40 p-6 text-center">
            <div className="font-display text-3xl text-bone">{c.t}</div>
            <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/60 mt-2">{c.d}</div>
          </div>
        ))}
      </div>
      <div className="mt-12 border-l-4 pl-6 py-2 max-w-3xl" style={{ borderColor: "var(--blood)" }}>
        <p className="font-cond text-lg md:text-xl text-bone/90">
          BWFMEDIA = <span className="text-bone font-bold">all three</span> + a <span style={{ color: "var(--blood)" }} className="font-bold">culture niche</span> + a proven <span className="text-bone font-bold">viral engine</span>.
        </p>
      </div>
    </Slide>
  );
}

function Growth() {
  return (
    <Slide number="09" label="Growth Strategy">
      <div className="flex items-center gap-4 mb-6">
        <Rocket className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">How we scale from here</span>
      </div>
      <H>The next 24 months.</H>
      <ul className="space-y-5 max-w-3xl mt-8">
        <Bullet>Scale viral content production across all platforms</Bullet>
        <Bullet>Expand artist partnerships and exclusive interviews</Bullet>
        <Bullet>Launch the full BWFMEDIA TV streaming platform</Bullet>
        <Bullet>Paid ad amplification on top-performing content</Bullet>
        <Bullet>Influencer collaborations to expand reach</Bullet>
      </ul>
    </Slide>
  );
}

function Financials() {
  return (
    <Slide number="10" label="Financial Projections">
      <div className="flex items-center gap-4 mb-6">
        <LineChart className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">Revenue trajectory</span>
      </div>
      <H>From $500K to<br />$5M in 36 months.</H>
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {[
          { y: "Year 1", v: "$250K – $500K" },
          { y: "Year 2", v: "$1M+" },
          { y: "Year 3", v: "$3M – $5M" },
        ].map((f) => (
          <div key={f.y} className="border border-border bg-black/40 p-6">
            <div className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/60">{f.y}</div>
            <div className="font-display text-3xl md:text-4xl mt-3 red-shadow" style={{ color: "var(--blood)" }}>{f.v}</div>
          </div>
        ))}
      </div>
      <p className="mt-10 font-cond text-lg text-bone/80 max-w-3xl">
        Driven by scaling content output, expanding monetization systems, and converting our existing audience into paying customers and subscribers.
      </p>
    </Slide>
  );
}

function Ask() {
  return (
    <Slide number="11" label="The Ask">
      <div className="flex items-center gap-4 mb-6">
        <Target className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">Investment opportunity</span>
      </div>
      <H>Raising<br /><span style={{ color: "var(--blood)" }}>$500K – $1M.</span></H>
      <div className="mt-8">
        <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60 mb-4">Use of funds</div>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
          {[
            "Content production & studio infrastructure",
            "Platform development (BWFMEDIA TV)",
            "Marketing & paid ad amplification",
            "Team expansion (editors, producers, sales)",
          ].map((t) => (
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

function Vision() {
  return (
    <Slide number="12" label="Vision">
      <div className="flex items-center gap-4 mb-6">
        <Eye className="w-8 h-8" style={{ color: "var(--blood)" }} />
        <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">Where we're going</span>
      </div>
      <h2 className="font-display text-4xl md:text-6xl leading-[1.05] text-bone max-w-4xl">
        "Become the <span style={{ color: "var(--blood)" }}>#1 independent digital network</span> for culture-driven content."
      </h2>
    </Slide>
  );
}

function Closing() {
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
            Founder · <span className="text-bone font-bold">Dantavious Lee</span>
          </p>
          <a
            href="mailto:hello@bwfmedia.tv"
            className="inline-flex items-center gap-3 mt-10 px-8 py-4 font-cond font-bold tracking-[0.3em] text-sm uppercase text-bone"
            style={{ backgroundColor: "var(--blood)" }}
          >
            <Mail className="w-4 h-4" /> Contact for Investment
          </a>
          <div className="mt-12 grid grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto">
            <StatCard big="687M+" label="Views" />
            <StatCard big="325K+" label="Subs" />
            <StatCard big="18M+" label="Likes" />
          </div>
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

function DeckPage() {
  return (
    <main className="bg-black min-h-screen">
      <DeckNav />
      <Cover />
      <Problem />
      <Solution />
      <Traction />
      <Ecosystem />
      <Market />
      <BusinessModel />
      <Competition />
      <Growth />
      <Financials />
      <Ask />
      <Vision />
      <Closing />
    </main>
  );
}