import { SlideShell } from "./SlideShell";
import { motion } from "framer-motion";
import logo from "@/assets/tunevio-logo.png.asset.json";
import {
  Play,
  Search,
  DollarSign,
  Upload,
  MessageCircle,
  Trophy,
  Users,
  Music,
  LayoutDashboard,
  Zap,
  Building2,
  Radio,
  Megaphone,
  CreditCard,
  Globe,
  Rocket,
  TrendingUp,
  ArrowDown,
  ArrowRight,
  Check,
  Minus,
  Target,
  Sparkles,
} from "lucide-react";

const TOTAL = 12;

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-cond font-bold tracking-[0.4em] text-xs uppercase mb-4"
      style={{ color: "var(--blood)" }}
    >
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-6xl leading-[1.02] tracking-tight text-bone">{children}</h2>
  );
}

function Card({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      {...fade(delay)}
      className="border border-border bg-black/40 backdrop-blur-sm p-7 rounded-lg"
    >
      {icon && <div className="mb-4" style={{ color: "var(--blood)" }}>{icon}</div>}
      <div className="font-cond font-bold tracking-[0.2em] text-sm uppercase text-bone mb-2">
        {title}
      </div>
      <div className="text-bone/60 text-lg leading-relaxed">{children}</div>
    </motion.div>
  );
}

function Flow({ steps, className = "" }: { steps: string[]; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {steps.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="px-6 py-2.5 border border-blood/60 bg-blood/10 rounded-full font-cond font-bold tracking-[0.15em] text-sm uppercase text-bone text-center">
            {s}
          </div>
          {i < steps.length - 1 && <ArrowDown className="w-4 h-4 text-blood" />}
        </div>
      ))}
    </div>
  );
}

/* ================= SLIDE 1 — COVER ================= */
export function Slide1() {
  return (
    <SlideShell number={1} total={TOTAL} label="Seed / Pre-Seed — 2026">
      <div className="flex-1 flex flex-col items-center justify-center px-16 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 blur-3xl opacity-40 -z-10" style={{ backgroundColor: "var(--blood)" }} />
          <img
            src={logo.url}
            alt="Tunevio"
            className="w-[300px] h-[300px] object-contain mix-blend-screen drop-shadow-[0_0_40px_rgba(220,38,38,0.4)]"
          />
        </motion.div>
        <motion.div {...fade(0.2)} className="font-display text-8xl tracking-tight text-bone heavy-shadow">
          TUNEVIO
        </motion.div>
        <motion.p
          {...fade(0.35)}
          className="mt-6 font-cond font-bold tracking-[0.35em] text-2xl uppercase"
          style={{ color: "var(--blood)" }}
        >
          The Interactive Music Economy
        </motion.p>
        <motion.p {...fade(0.5)} className="mt-6 font-cond tracking-[0.25em] text-lg uppercase text-bone/70">
          Stream. Discover. Compete. Distribute. Earn.
        </motion.p>
        <motion.div
          {...fade(0.65)}
          className="mt-12 px-10 py-4 border-2 rounded-full font-display text-3xl"
          style={{ borderColor: "var(--blood)", color: "var(--bone)" }}
        >
          $1,000,000 Seed / Pre-Seed Raise
        </motion.div>
        <motion.p {...fade(0.8)} className="mt-10 max-w-4xl text-bone/50 text-xl leading-relaxed">
          Tunevio is building an all-in-one music ecosystem where independent artists can
          distribute music, build audiences, stream, compete live, and monetize their fans
          from one platform.
        </motion.p>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 2 — THE OPPORTUNITY ================= */
export function Slide2() {
  const needs = [
    "One platform for distribution",
    "Another for streaming",
    "Another for fan engagement",
    "Another for live interaction",
    "Another for monetization",
    "Another for payments and audience growth",
  ];
  return (
    <SlideShell number={2} total={TOTAL} label="The Opportunity">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 01 — The Opportunity</Kicker>
        <H2>
          Music streaming is massive. <span style={{ color: "var(--blood)" }}>Artist monetization is fragmented.</span>
        </H2>
        <p className="mt-6 max-w-5xl text-bone/60 text-2xl leading-relaxed">
          Music has moved from ownership to streaming — but the artist experience remains
          fragmented across multiple platforms. An independent artist may need:
        </p>
        <div className="mt-8 grid grid-cols-3 gap-4">
          {needs.map((n, i) => (
            <motion.div
              key={i}
              {...fade(0.15 + i * 0.07)}
              className="border border-border bg-black/40 px-6 py-5 rounded-lg text-bone/80 text-xl flex items-center gap-3"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--blood)" }} />
              {n}
            </motion.div>
          ))}
        </div>
        <motion.div {...fade(0.6)} className="mt-10 flex flex-wrap items-center gap-6">
          <div className="font-display text-4xl text-bone">
            Tunevio brings these experiences <span style={{ color: "var(--blood)" }}>together.</span>
          </div>
        </motion.div>
        <motion.div {...fade(0.7)} className="mt-8 border-l-4 pl-6 py-2" style={{ borderColor: "var(--blood)" }}>
          <div className="text-bone/80 text-xl leading-relaxed max-w-5xl">
            Global recorded-music revenue reached <span className="text-bone font-bold">$31.7B in 2025</span>,
            with paid subscription streaming generating <span className="text-bone font-bold">52.4%</span> of
            industry revenue and <span className="text-bone font-bold">837M</span> paid streaming subscription
            accounts globally. <span className="text-bone/40">(IFPI)</span>
          </div>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 3 — THE PROBLEM ================= */
export function Slide3() {
  const problems = [
    { icon: <Search className="w-7 h-7" />, title: "Discovery", text: "Getting discovered in crowded streaming and social platforms is difficult." },
    { icon: <DollarSign className="w-7 h-7" />, title: "Monetization", text: "Streaming alone does not give artists enough direct ways to monetize superfans." },
    { icon: <Upload className="w-7 h-7" />, title: "Distribution", text: "Artists must navigate separate distribution and release workflows." },
    { icon: <MessageCircle className="w-7 h-7" />, title: "Engagement", text: "Traditional streaming is largely passive." },
    { icon: <Trophy className="w-7 h-7" />, title: "Competition", text: "Limited mechanisms turn music discovery into interactive entertainment." },
    { icon: <Users className="w-7 h-7" />, title: "Fan Conversion", text: "An artist can have listeners without a meaningful direct relationship with them." },
  ];
  return (
    <SlideShell number={3} total={TOTAL} label="The Problem">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 02 — The Problem</Kicker>
        <H2>
          Artists have audiences. <span style={{ color: "var(--blood)" }}>Their monetization stack is fragmented.</span>
        </H2>
        <div className="mt-10 grid grid-cols-3 gap-5">
          {problems.map((p, i) => (
            <Card key={p.title} icon={p.icon} title={p.title} delay={0.1 + i * 0.07}>
              {p.text}
            </Card>
          ))}
        </div>
        <motion.div {...fade(0.6)} className="mt-10 font-display text-4xl text-bone">
          The missing layer is <span style={{ color: "var(--blood)" }}>interaction.</span>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 4 — THE SOLUTION ================= */
export function Slide4() {
  const steps = [
    { title: "Streaming", text: "Fans discover and listen to music." },
    { title: "Distribution", text: "Artists submit and distribute releases." },
    { title: "Artist Monetization", text: "Artists create recurring and transactional revenue." },
    { title: "Play Arena", text: "Artists compete in live music battles." },
    { title: "Fan Participation", text: "Audiences vote, support and engage." },
    { title: "Creator Economy", text: "Artists build audiences that generate multiple revenue streams." },
  ];
  return (
    <SlideShell number={4} total={TOTAL} label="The Solution">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 03 — The Solution</Kicker>
        <H2>
          Tunevio. <span style={{ color: "var(--blood)" }}>One ecosystem connecting artists, music and fans.</span>
        </H2>
        <div className="mt-10 grid grid-cols-2 gap-x-12 gap-y-4">
          {steps.map((s, i) => (
            <motion.div key={s.title} {...fade(0.1 + i * 0.07)} className="flex items-center gap-5">
              <div
                className="shrink-0 w-14 h-14 flex items-center justify-center rounded-full border-2 font-display text-xl"
                style={{ borderColor: "var(--blood)", color: "var(--blood)" }}
              >
                {i + 1}
              </div>
              <div>
                <div className="font-cond font-bold tracking-[0.15em] text-lg uppercase text-bone">{s.title}</div>
                <div className="text-bone/55 text-lg">{s.text}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div {...fade(0.6)} className="mt-12 border-l-4 pl-6 py-2 max-w-5xl" style={{ borderColor: "var(--blood)" }}>
          <div className="font-display text-3xl leading-snug text-bone">
            Tunevio turns music from a primarily passive listening experience into an{" "}
            <span style={{ color: "var(--blood)" }}>interactive music economy.</span>
          </div>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 5 — THE PRODUCT ================= */
export function Slide5() {
  const cols = [
    {
      icon: <Music className="w-7 h-7" />,
      title: "Listener Experience",
      items: ["Music streaming", "Artist discovery", "Artist profiles", "Playlists", "Premium subscriptions", "Family plans", "Personalized discovery"],
    },
    {
      icon: <LayoutDashboard className="w-7 h-7" />,
      title: "Artist Experience",
      items: ["Artist dashboard", "Music uploads", "Distribution", "Release management", "Artist membership", "Earnings", "Audience building"],
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: "Interactive Experience",
      items: ["Play Arena", "Live music battles", "Audience voting", "Boost credits", "Skip the Line", "Host-controlled live participation"],
    },
    {
      icon: <Building2 className="w-7 h-7" />,
      title: "Business Infrastructure",
      items: ["Revenue ledger", "Artist payouts", "Subscription billing", "Distribution infrastructure", "Fraud controls", "Payment infrastructure"],
    },
  ];
  return (
    <SlideShell number={5} total={TOTAL} label="The Product">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 04 — The Product</Kicker>
        <H2>
          An ecosystem, <span style={{ color: "var(--blood)" }}>not a single feature.</span>
        </H2>
        <div className="mt-10 grid grid-cols-4 gap-5">
          {cols.map((c, i) => (
            <motion.div key={c.title} {...fade(0.1 + i * 0.08)} className="border border-border bg-black/40 rounded-lg p-6">
              <div className="mb-3" style={{ color: "var(--blood)" }}>{c.icon}</div>
              <div className="font-cond font-bold tracking-[0.15em] text-base uppercase text-bone mb-4">{c.title}</div>
              <ul className="space-y-2.5">
                {c.items.map((it) => (
                  <li key={it} className="flex items-center gap-2.5 text-bone/60 text-base">
                    <Check className="w-4 h-4 shrink-0" style={{ color: "var(--blood)" }} />
                    {it}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 6 — THE DIFFERENTIATOR (PLAY ARENA) ================= */
export function Slide6() {
  const flow = ["Artist enters queue", "Music is played", "Audience listens", "Audience votes", "Artists compete", "Winners advance / gain exposure", "Artists monetize their audience"];
  const monetization = ["Artist memberships", "Voting credits", "Boost credits", "$25 Skip the Line", "Premium participation features", "Future sponsorships", "Advertising opportunities"];
  return (
    <SlideShell number={6} total={TOTAL} label="The Differentiator">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 05 — The Differentiator</Kicker>
        <div className="flex items-center gap-5">
          <Trophy className="w-14 h-14" style={{ color: "var(--blood)" }} />
          <h2 className="font-display text-7xl tracking-tight text-bone">
            PLAY <span style={{ color: "var(--blood)" }}>ARENA</span>
          </h2>
        </div>
        <p className="mt-4 font-cond tracking-[0.25em] text-xl uppercase text-bone/70">
          Music becomes a live competition.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-12">
          <div>
            <Flow steps={flow} />
          </div>
          <div className="flex flex-col gap-6">
            <motion.div {...fade(0.3)} className="border border-border bg-black/40 rounded-lg p-7">
              <div className="text-bone/70 text-xl leading-relaxed">
                Tunevio is not simply asking{" "}
                <span className="text-bone">“What song do you want to hear?”</span>
                <br />
                It creates a new question:{" "}
                <span className="font-bold" style={{ color: "var(--blood)" }}>“Which artist deserves to win?”</span>
              </div>
              <div className="mt-4 text-bone/55 text-lg">
                Competition, participation, social interaction and repeat engagement — around music.
              </div>
            </motion.div>
            <motion.div {...fade(0.45)} className="border border-blood/50 bg-blood/10 rounded-lg p-7">
              <div className="font-cond font-bold tracking-[0.2em] text-sm uppercase text-bone mb-3">Monetization</div>
              <div className="flex flex-wrap gap-2.5">
                {monetization.map((m) => (
                  <span key={m} className="px-4 py-1.5 border border-blood/60 rounded-full font-cond text-sm tracking-wider uppercase text-bone/85">
                    {m}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 7 — BUSINESS MODEL ================= */
export function Slide7() {
  const engines = [
    { n: "1", title: "Listener Subscriptions", text: "Premium · Family · Student · Lite" },
    { n: "2", title: "Artist Membership — $6.99/mo", text: "Enhanced platform capabilities and monetization opportunities." },
    { n: "3", title: "Skip the Line — $25", text: "Priority access within the Play Arena ecosystem." },
    { n: "4", title: "Voting / Boost Credits", text: "Paid engagement mechanics inside the competitive ecosystem." },
    { n: "5", title: "Music Distribution", text: "Artists pay for distribution and related services." },
    { n: "6", title: "Advertising", text: "Monetize listeners, artists and entertainment audiences." },
    { n: "7", title: "Creator Monetization", text: "Sponsorships, brand partnerships, premium creator tools, fan monetization, live events." },
    { n: "8", title: "Platform Revenue", text: "Tunevio participates in revenue generated throughout the ecosystem." },
  ];
  return (
    <SlideShell number={7} total={TOTAL} label="Business Model">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 06 — Business Model</Kicker>
        <H2>
          Multiple revenue engines. <span style={{ color: "var(--blood)" }}>No single point of dependence.</span>
        </H2>
        <div className="mt-10 grid grid-cols-4 gap-5">
          {engines.map((e, i) => (
            <motion.div key={e.n} {...fade(0.08 + i * 0.06)} className="border border-border bg-black/40 rounded-lg p-6">
              <div className="font-display text-4xl mb-3" style={{ color: "var(--blood)" }}>{e.n}</div>
              <div className="font-cond font-bold tracking-[0.12em] text-base uppercase text-bone mb-2 leading-snug">{e.title}</div>
              <div className="text-bone/55 text-base leading-relaxed">{e.text}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 8 — MARKET ================= */
export function Slide8() {
  const stats = [
    { v: "$31.7B", l: "Global recorded-music revenue, 2025 (+6.4% YoY)", s: "IFPI" },
    { v: "837M", l: "Paid streaming subscription accounts globally", s: "IFPI" },
    { v: "+8.8%", l: "Subscription streaming revenue growth", s: "IFPI" },
    { v: "751M", l: "Spotify monthly active users", s: "Spotify" },
    { v: "290M", l: "Spotify Premium subscribers", s: "Spotify" },
    { v: "$11B+", l: "Paid by Spotify to the music industry in 2025", s: "Spotify" },
  ];
  const categories = ["Music streaming", "Artist services", "Distribution", "Creator economy", "Live entertainment", "Fan monetization"];
  return (
    <SlideShell number={8} total={TOTAL} label="Market">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 07 — Market</Kicker>
        <H2>
          A massive and growing <span style={{ color: "var(--blood)" }}>music economy.</span>
        </H2>
        <div className="mt-10 grid grid-cols-3 gap-5">
          {stats.map((s, i) => (
            <motion.div key={s.v + i} {...fade(0.08 + i * 0.06)} className="border border-border bg-black/40 rounded-lg p-6">
              <div className="font-display text-5xl" style={{ color: "var(--blood)" }}>{s.v}</div>
              <div className="mt-2 text-bone/70 text-lg leading-snug">{s.l}</div>
              <div className="mt-1 font-cond tracking-[0.2em] text-xs uppercase text-bone/35">({s.s})</div>
            </motion.div>
          ))}
        </div>
        <motion.div {...fade(0.5)} className="mt-8 flex flex-wrap items-center gap-3">
          <span className="font-cond tracking-[0.2em] text-sm uppercase text-bone/50 mr-2">Capturing value across:</span>
          {categories.map((c) => (
            <span key={c} className="px-4 py-1.5 border border-border rounded-full font-cond text-sm tracking-wider uppercase text-bone/75">{c}</span>
          ))}
        </motion.div>
        <motion.div {...fade(0.6)} className="mt-6 border-l-4 pl-6 py-2 max-w-5xl" style={{ borderColor: "var(--blood)" }}>
          <div className="text-bone/80 text-xl leading-relaxed">
            Music consumption is already massive. Tunevio doesn't need to create the market —{" "}
            <span className="text-bone font-bold">it creates a better economic layer around it.</span>
          </div>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 9 — COMPETITIVE POSITIONING ================= */
export function Slide9() {
  const rows: { name: string; cells: (boolean | string)[]; highlight?: boolean }[] = [
    { name: "Traditional streaming", cells: [true, false, "Limited", false, false] },
    { name: "Distribution platforms", cells: [false, true, true, false, false] },
    { name: "Creator platforms", cells: ["Limited", false, true, true, "Limited"] },
    { name: "Live platforms", cells: [false, false, true, true, true] },
    { name: "Tunevio", cells: [true, true, true, true, true], highlight: true },
  ];
  const headers = ["Streaming", "Distribution", "Artist Monetization", "Live Competition", "Fan Voting"];
  return (
    <SlideShell number={9} total={TOTAL} label="Positioning">
      <div className="flex-1 flex flex-col justify-center px-20 py-16">
        <Kicker>Slide 08 — Competitive Positioning</Kicker>
        <H2>
          Positioned between <span style={{ color: "var(--blood)" }}>multiple categories.</span>
        </H2>
        <motion.div {...fade(0.2)} className="mt-10 border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-6 bg-black/60 border-b border-border">
            <div className="px-5 py-4 font-cond font-bold tracking-[0.15em] text-xs uppercase text-bone/50">Platform Category</div>
            {headers.map((h) => (
              <div key={h} className="px-3 py-4 font-cond font-bold tracking-[0.1em] text-xs uppercase text-bone/50 text-center">{h}</div>
            ))}
          </div>
          {rows.map((r) => (
            <div
              key={r.name}
              className={`grid grid-cols-6 border-b border-border last:border-0 ${r.highlight ? "bg-blood/15" : "bg-black/30"}`}
            >
              <div className={`px-5 py-4 font-cond font-bold tracking-[0.1em] text-sm uppercase ${r.highlight ? "" : "text-bone/80"}`} style={r.highlight ? { color: "var(--blood)" } : undefined}>
                {r.name}
              </div>
              {r.cells.map((c, i) => (
                <div key={i} className="px-3 py-4 flex items-center justify-center">
                  {c === true ? (
                    <Check className="w-6 h-6" style={{ color: r.highlight ? "var(--blood)" : "var(--bone)" }} />
                  ) : c === false ? (
                    <Minus className="w-6 h-6 text-bone/25" />
                  ) : (
                    <span className="font-cond text-sm tracking-wider uppercase text-bone/45">{c}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </motion.div>
        <motion.div {...fade(0.45)} className="mt-8 flex items-end justify-between gap-10">
          <div className="text-bone/70 text-xl leading-relaxed max-w-3xl">
            <span className="text-bone font-bold">Spotify meets artist distribution meets interactive live competition.</span>{" "}
            The goal is not to copy existing platforms — it's to build a category.
          </div>
          <div className="shrink-0 font-display text-4xl" style={{ color: "var(--blood)" }}>
            Interactive Music Economy
          </div>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 10 — TRACTION & GTM ================= */
export function Slide10() {
  const built = ["Streaming infrastructure", "Artist profiles & dashboards", "Revenue systems & artist payouts", "Subscription infrastructure", "Distribution workflows", "Live Play Arena & voting", "Boost mechanics & Skip the Line", "Artist memberships", "Payment infrastructure", "Fraud controls", "Real-time live interaction"];
  const phases = [
    { n: "Phase 1", title: "Artist acquisition", text: "Independent & emerging artists, hip-hop/R&B, DJs, creators, artist communities, independent labels." },
    { n: "Phase 2", title: "Audience acquisition", text: "Artists bring listeners → listeners discover artists → competition generates content → content drives social distribution." },
    { n: "Phase 3", title: "Monetization", text: "Subscriptions, artist memberships, boosts, Skip the Line, distribution revenue, advertising, sponsorships." },
    { n: "Phase 4", title: "Network expansion", text: "Music influencers, creators, podcasts, entertainment communities, brands, events, strategic partnerships." },
  ];
  return (
    <SlideShell number={10} total={TOTAL} label="Traction & Go-To-Market">
      <div className="flex-1 flex flex-col justify-center px-20 py-14">
        <div className="grid grid-cols-2 gap-14">
          <div>
            <Kicker>Slide 09 — Traction</Kicker>
            <H2>
              Beyond the <span style={{ color: "var(--blood)" }}>idea stage.</span>
            </H2>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {built.map((b, i) => (
                <motion.span key={b} {...fade(0.1 + i * 0.04)} className="px-4 py-1.5 border border-border bg-black/40 rounded-full font-cond text-sm tracking-wider uppercase text-bone/80 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" style={{ color: "var(--blood)" }} />
                  {b}
                </motion.span>
              ))}
            </div>
            <motion.div {...fade(0.5)} className="mt-7 border-l-4 pl-5 py-1.5" style={{ borderColor: "var(--blood)" }}>
              <div className="text-bone/75 text-lg leading-relaxed">
                Core platform and revenue-engine components are substantially developed.{" "}
                <span className="text-bone font-bold">Next: product development → controlled market launch → measurable growth.</span>
              </div>
            </motion.div>
          </div>
          <div>
            <Kicker>Slide 10 — Go-To-Market</Kicker>
            <H2>
              Start with artists. <span style={{ color: "var(--blood)" }}>Grow through communities.</span>
            </H2>
            <div className="mt-7 space-y-4">
              {phases.map((p, i) => (
                <motion.div key={p.n} {...fade(0.1 + i * 0.08)} className="flex gap-4 border border-border bg-black/40 rounded-lg p-5">
                  <div className="shrink-0 font-cond font-bold tracking-[0.15em] text-xs uppercase px-3 py-1.5 border border-blood/60 rounded h-fit" style={{ color: "var(--blood)" }}>{p.n}</div>
                  <div>
                    <div className="font-cond font-bold tracking-[0.12em] text-base uppercase text-bone">{p.title}</div>
                    <div className="text-bone/55 text-base leading-relaxed mt-1">{p.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 11 — THE RAISE ================= */
export function Slide11() {
  const funds = [
    ["Product & Engineering", "$300,000"],
    ["Streaming / Cloud Infrastructure", "$150,000"],
    ["Artist Acquisition & Marketing", "$200,000"],
    ["Team & Operations", "$150,000"],
    ["Licensing / Legal / Compliance", "$75,000"],
    ["Partnerships / Business Development", "$50,000"],
    ["Strategic Reserve", "$75,000"],
  ];
  const objectives = ["Product hardening", "Infrastructure scaling", "Artist acquisition", "Listener acquisition", "Play Arena launch", "Distribution expansion", "Revenue optimization", "Strategic partnerships", "Measurement of unit economics", "Preparation for the next institutional round"];
  return (
    <SlideShell number={11} total={TOTAL} label="The Raise">
      <div className="flex-1 flex flex-col justify-center px-20 py-14">
        <Kicker>Slide 11 — The $1 Million Raise</Kicker>
        <div className="flex items-baseline gap-8">
          <h2 className="font-display text-8xl tracking-tight" style={{ color: "var(--blood)" }}>$1,000,000</h2>
          <div className="font-cond font-bold tracking-[0.25em] text-xl uppercase text-bone/70">Seed / Pre-Seed Round</div>
        </div>
        <p className="mt-4 text-bone/60 text-xl max-w-5xl">
          Capital moves Tunevio from advanced product development into scalable commercial growth.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-12">
          <motion.div {...fade(0.2)} className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 bg-black/60 border-b border-border px-6 py-3.5 font-cond font-bold tracking-[0.15em] text-xs uppercase text-bone/50">
              <span>Use of Funds</span><span className="text-right">Allocation</span>
            </div>
            {funds.map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 px-6 py-3 border-b border-border bg-black/30 text-lg">
                <span className="text-bone/80">{k}</span>
                <span className="text-right font-cond font-bold text-bone">{v}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 px-6 py-3.5 bg-blood/20 text-lg">
              <span className="font-cond font-bold tracking-[0.15em] uppercase text-bone">Total</span>
              <span className="text-right font-display text-2xl" style={{ color: "var(--blood)" }}>$1,000,000</span>
            </div>
          </motion.div>
          <div>
            <div className="font-cond font-bold tracking-[0.2em] text-sm uppercase text-bone mb-4">Capital objectives</div>
            <div className="grid grid-cols-2 gap-3">
              {objectives.map((o, i) => (
                <motion.div key={o} {...fade(0.15 + i * 0.05)} className="flex items-center gap-2.5 border border-border bg-black/40 rounded px-4 py-3 text-bone/80 text-base">
                  <Target className="w-4 h-4 shrink-0" style={{ color: "var(--blood)" }} />
                  {o}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 12 — THE VISION / CLOSE ================= */
export function Slide12() {
  const path = ["Create", "Distribute", "Stream", "Compete", "Build fans", "Monetize", "Get paid"];
  return (
    <SlideShell number={12} total={TOTAL} label="The Vision">
      <div className="flex-1 flex flex-col items-center justify-center px-16 text-center">
        <Kicker>Slide 12 — The Vision</Kicker>
        <h2 className="font-display text-6xl leading-[1.05] tracking-tight text-bone max-w-6xl">
          Build the economic layer for the{" "}
          <span style={{ color: "var(--blood)" }}>next generation of music.</span>
        </h2>
        <motion.div {...fade(0.25)} className="mt-10 flex flex-wrap items-center justify-center gap-3 max-w-6xl">
          {path.map((p, i) => (
            <div key={p} className="flex items-center gap-3">
              <span className="px-5 py-2 border border-blood/60 bg-blood/10 rounded-full font-cond font-bold tracking-[0.15em] text-base uppercase text-bone">{p}</span>
              {i < path.length - 1 && <ArrowRight className="w-5 h-5" style={{ color: "var(--blood)" }} />}
            </div>
          ))}
        </motion.div>
        <motion.p {...fade(0.4)} className="mt-8 font-cond tracking-[0.3em] text-lg uppercase text-bone/60">
          One platform. One ecosystem. Multiple revenue opportunities.
        </motion.p>
        <motion.div {...fade(0.55)} className="mt-12 relative flex items-center justify-center">
          <div className="absolute inset-0 blur-3xl opacity-30 -z-10" style={{ backgroundColor: "var(--blood)" }} />
          <div>
            <div className="font-display text-8xl tracking-tight text-bone heavy-shadow">TUNEVIO</div>
            <div className="mt-3 font-cond font-bold tracking-[0.35em] text-xl uppercase" style={{ color: "var(--blood)" }}>
              The Interactive Music Economy
            </div>
            <div className="mt-2 font-cond tracking-[0.25em] text-base uppercase text-bone/60">
              Stream. Compete. Connect. Earn.
            </div>
          </div>
        </motion.div>
        <motion.div {...fade(0.7)} className="mt-10 flex items-center gap-4">
          <Sparkles className="w-5 h-5" style={{ color: "var(--blood)" }} />
          <span className="font-cond tracking-[0.2em] text-base uppercase text-bone/70">
            $1M Seed/Pre-Seed — Seeking investors who understand: Music · Creator Economy · Streaming · Fintech · Live Entertainment · Technology
          </span>
          <Sparkles className="w-5 h-5" style={{ color: "var(--blood)" }} />
        </motion.div>
      </div>
    </SlideShell>
  );
}

export const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10, Slide11, Slide12];
