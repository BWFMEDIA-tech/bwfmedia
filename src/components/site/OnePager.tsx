import { motion } from "framer-motion";
import {
  Play, Mic, Film, Smartphone, Flame, TrendingUp, Users,
  DollarSign, Globe, Handshake, Trophy, Sparkles, Mail, Instagram, Youtube, ArrowUpRight,
} from "lucide-react";
import grunge from "@/assets/grunge-bg.jpg";
import bwfLogo from "@/assets/bwf-logo.jpg";
import camera from "@/assets/camera.png";
import audience from "@/assets/audience.jpg";
import viralThumbs from "@/assets/viral-thumbs.jpg";
import musicVideo from "@/assets/music-video.jpg";

/* ---------- shared bits ---------- */

function Section({
  id,
  label,
  number,
  children,
  className = "",
}: {
  id?: string;
  label?: string;
  number?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative w-full overflow-hidden grunge-overlay border-b border-border ${className}`}
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.92)), url(${grunge})`,
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
      {(label || number) && (
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 flex items-center justify-between">
          {label && (
            <span className="font-cond font-bold tracking-[0.4em] text-xs uppercase" style={{ color: "var(--blood)" }}>
              {number ? `${number} — ${label}` : label}
            </span>
          )}
          <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 hidden md:block">
            BWF MEDIA TV
          </span>
        </div>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {children}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

function StatBlock({ big, label }: { big: string; label: string }) {
  return (
    <div className="text-left">
      <div className="font-display text-5xl md:text-7xl leading-none red-shadow" style={{ color: "var(--blood)" }}>{big}</div>
      <div className="font-cond font-bold tracking-[0.4em] text-[10px] md:text-xs uppercase text-bone/70 mt-2">{label}</div>
    </div>
  );
}

/* ---------- nav ---------- */

function Nav() {
  const links = [
    { href: "#proof", label: "Proof" },
    { href: "#engine", label: "Engine" },
    { href: "#audience", label: "Audience" },
    { href: "#revenue", label: "Revenue" },
    { href: "#partner", label: "Partner" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur bg-black/70 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-8 h-8 object-contain" />
          <span className="font-display text-lg md:text-xl tracking-tight text-bone">
            BWF MEDIA <span style={{ color: "var(--blood)" }}>TV</span>
          </span>
        </a>
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="#contact"
          className="px-4 py-2 font-cond font-bold tracking-[0.25em] text-[10px] md:text-[11px] uppercase text-bone"
          style={{ backgroundColor: "var(--blood)" }}
        >
          Book Now
        </a>
      </div>
    </nav>
  );
}

/* ---------- HERO ---------- */

function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-screen w-full overflow-hidden grunge-overlay flex items-center justify-center pt-20"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(${grunge})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />

      <img
        src={camera}
        alt=""
        className="absolute -right-16 -bottom-12 w-[280px] md:w-[420px] opacity-25 mix-blend-screen pointer-events-none"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-16 text-center flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="flex items-center justify-center w-12 h-9 rounded" style={{ backgroundColor: "var(--blood)" }}>
            <Play className="w-4 h-4 fill-bone text-bone" />
          </div>
          <span className="font-cond font-bold tracking-[0.4em] text-xs uppercase text-bone/70">
            YouTube Channel
          </span>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 blur-3xl opacity-40 -z-10" style={{ backgroundColor: "var(--blood)" }} />
          <img
            src={bwfLogo}
            alt="BWF Media"
            className="w-[220px] md:w-[340px] h-[220px] md:h-[340px] object-contain mix-blend-screen drop-shadow-[0_0_40px_rgba(220,38,38,0.4)]"
          />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-display text-5xl md:text-7xl tracking-tight text-bone heavy-shadow"
        >
          MEDIA <span style={{ color: "var(--blood)" }}>TV</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-6 font-cond font-bold tracking-[0.3em] text-base md:text-xl uppercase text-bone"
        >
          Real Content. Real People. <span style={{ color: "var(--blood)" }}>Real Views.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-10 flex items-center gap-8 md:gap-12"
        >
          <StatBlock big="686M+" label="Views" />
          <div className="w-px h-16 md:h-20 bg-bone/20" />
          <StatBlock big="324K+" label="Subscribers" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.75 }}
          className="mt-10 font-brush text-2xl md:text-3xl text-bone/80"
        >
          Where Culture <span style={{ color: "var(--blood)" }}>Goes Viral</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#contact"
            className="px-7 py-4 font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone"
            style={{ backgroundColor: "var(--blood)" }}
          >
            Book a Shoot
          </a>
          <a
            href="https://youtube.com/@bwfmedia"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-4 font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone border-2 border-border hover:border-blood transition-colors"
          >
            Watch on YouTube
          </a>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

/* ---------- THE SHIFT ---------- */

function Shift() {
  return (
    <Section id="shift" number="01" label="The Shift">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-8">
            HIP-HOP MEDIA<br />
            <span style={{ color: "var(--blood)" }}>IS CHANGING</span>
          </h2>
          <ul className="space-y-4 text-bone/85 text-base md:text-lg">
            {[
              "Culture moves faster than mainstream media",
              "Viral moments break before major platforms catch on",
              "Audiences want raw, unfiltered, real content",
            ].map((t, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="block w-2 h-2 mt-3 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}>
            <span className="font-display text-2xl md:text-3xl tracking-tight" style={{ color: "var(--blood)" }}>
              BWF MEDIA IS ALREADY THERE.
            </span>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden">
          <img src={audience} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.85))" }} />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="font-brush text-xl md:text-2xl" style={{ color: "var(--blood)" }}>The next generation</div>
            <div className="font-display text-4xl md:text-5xl text-bone leading-none mt-1">DOESN'T WAIT.</div>
          </div>
          <div className="absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: "var(--blood)" }} />
          <div className="absolute top-3 right-10 font-cond font-bold tracking-widest text-[10px] uppercase text-bone">LIVE</div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- PROOF ---------- */

function Proof() {
  const stats = [
    { big: "686M+", label: "TOTAL VIEWS", sub: "Across all platforms" },
    { big: "8M+", label: "MONTHLY VIEWS", sub: "Average reach" },
    { big: "324K+", label: "SUBSCRIBERS", sub: "Active community" },
  ];
  return (
    <Section id="proof" number="02" label="Track Record">
      <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-12">
        WE DON'T CHASE VIRAL —<br />
        <span style={{ color: "var(--blood)" }}>WE CREATE IT.</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
        {stats.map((s, i) => (
          <div
            key={i}
            className="border-l-4 pl-6 py-4"
            style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <div className="font-display text-5xl md:text-7xl leading-none red-shadow" style={{ color: "var(--blood)" }}>{s.big}</div>
            <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone mt-3">{s.label}</div>
            <div className="text-bone/60 text-sm mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="relative aspect-[16/7] overflow-hidden border" style={{ borderColor: "var(--blood)" }}>
        <img src={viralThumbs} alt="Viral video stills" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.85), transparent 40%)" }} />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/80">Featured viral hits</span>
          <span className="font-brush text-xl" style={{ color: "var(--blood)" }}>+ 200 more</span>
        </div>
      </div>
    </Section>
  );
}

/* ---------- ENGINE ---------- */

function Engine() {
  const items = [
    { icon: Mic, title: "Interviews", desc: "1-on-1 viral conversations with artists, athletes, and culture-shakers." },
    { icon: Film, title: "Music Videos", desc: "HD productions that double as viral marketing assets." },
    { icon: Smartphone, title: "Viral Clips", desc: "Short-form cuts engineered for TikTok, Reels & Shorts." },
    { icon: Flame, title: "Street Content", desc: "Raw, unscripted moments straight from the culture." },
  ];
  return (
    <Section id="engine" number="03" label="Content Engine">
      <div className="grid md:grid-cols-5 gap-10 md:gap-12">
        <div className="md:col-span-2">
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow">
            ONE SHOOT.<br />
            <span style={{ color: "var(--blood)" }}>MULTIPLE</span><br />
            VIRAL ASSETS.
          </h2>
          <p className="mt-6 text-bone/70 text-base md:text-lg leading-relaxed max-w-sm">
            Every piece of content is engineered for distribution across YouTube, Shorts, Reels, TikTok, and IG — turning one shoot into a full media cycle.
          </p>
        </div>
        <div className="md:col-span-3 grid sm:grid-cols-2 gap-5">
          {items.map((it, i) => (
            <div
              key={i}
              className="relative p-6 border-2 hover:border-blood transition-colors"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded mb-4" style={{ backgroundColor: "var(--blood)" }}>
                <it.icon className="w-6 h-6 text-bone" strokeWidth={2.5} />
              </div>
              <div className="font-display text-2xl md:text-3xl text-bone tracking-tight mb-2">{it.title.toUpperCase()}</div>
              <div className="text-bone/60 text-sm leading-relaxed">{it.desc}</div>
              <div className="absolute top-4 right-4 font-cond text-xs tracking-widest text-bone/30">0{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- AUDIENCE ---------- */

function Audience() {
  const rows = [
    { k: "AGE", v: "18 – 34", note: "Peak cultural buying power" },
    { k: "REGION", v: "United States", note: "Strong Southern influence" },
    { k: "INTEREST", v: "Hip-Hop & Street Culture", note: "Niche-deep, loyalty-high" },
    { k: "ENGAGEMENT", v: "Above category average", note: "Comments, shares, repeat views" },
  ];
  return (
    <Section id="audience" number="04" label="Demographics">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="relative aspect-[4/5] md:aspect-auto md:h-[520px] overflow-hidden">
          <img src={audience} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(0,0,0,0.85))" }} />
          <div className="absolute bottom-6 left-6">
            <div className="font-brush text-2xl text-bone">Culture is</div>
            <div className="font-display text-5xl md:text-6xl leading-none" style={{ color: "var(--blood)" }}>WATCHING.</div>
          </div>
        </div>
        <div>
          <h2 className="font-display text-5xl md:text-6xl leading-[0.9] text-bone heavy-shadow mb-8">
            REAL AUDIENCE.<br />
            <span style={{ color: "var(--blood)" }}>REAL ENGAGEMENT.</span>
          </h2>
          <div className="space-y-5">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[100px_1fr] gap-5 items-baseline pb-4 border-b border-border">
                <span className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase" style={{ color: "var(--blood)" }}>{row.k}</span>
                <div>
                  <div className="font-display text-xl md:text-2xl text-bone tracking-tight">{row.v}</div>
                  <div className="text-bone/50 text-sm">{row.note}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}>
            <span className="font-display text-xl md:text-2xl tracking-tight" style={{ color: "var(--blood)" }}>
              THIS AUDIENCE DRIVES CULTURE.
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- REVENUE ---------- */

function Revenue() {
  const tiers = [
    { name: "LIVE INTERVIEW", price: "$500", deposit: "$250 deposit", icon: Mic, items: ["1-on-1 (up to 45 min)", "Promo on all platforms", "Live on YouTube", "Full edit + thumbnail"] },
    { name: "MUSIC VIDEO", price: "$900", deposit: "$400 deposit", icon: Film, items: ["HD production", "Up to 4hr shoot", "Pro camera + edit", "YouTube upload + promo"] },
    { name: "PROMO PACKAGE", price: "$300", deposit: "$150 deposit", icon: TrendingUp, items: ["Upload to BWF Media TV", "Shoutout in video", "Shorts clip 15-30s", "Title + thumbnail optimized"] },
    { name: "AD REVENUE", price: "Recurring", deposit: "YouTube Partner", icon: DollarSign, items: ["Monthly ad payout", "Sponsor integrations", "Brand deal pipeline", "Channel memberships"] },
  ];
  return (
    <Section id="revenue" number="05" label="Monetization">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow">
          PROVEN <span style={{ color: "var(--blood)" }}>REVENUE</span> MODEL
        </h2>
        <div className="md:text-right">
          <div className="font-brush text-xl md:text-2xl text-bone/70">4 active streams</div>
          <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mt-1" style={{ color: "var(--blood)" }}>
            Already generating
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tiers.map((t, i) => (
          <div
            key={i}
            className="relative flex flex-col p-6 border-2"
            style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "var(--blood)" }} />
            <t.icon className="w-7 h-7 mb-4" style={{ color: "var(--blood)" }} strokeWidth={2.5} />
            <div className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/70 mb-2">{t.name}</div>
            <div className="font-display text-4xl md:text-5xl leading-none mb-1" style={{ color: "var(--blood)" }}>{t.price}</div>
            <div className="font-cond text-[10px] tracking-widest uppercase text-bone/50 mb-5">{t.deposit}</div>
            <ul className="space-y-2 mt-auto">
              {t.items.map((it, j) => (
                <li key={j} className="flex gap-2 text-bone/75 text-xs leading-snug">
                  <span className="block w-1 h-1 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- SCALE ---------- */

function Scale() {
  const items = [
    "More high-profile interviews & exclusives",
    "Higher production quality across the board",
    "Consistent content series & franchise IP",
    "Expanded reach into new regional markets",
  ];
  return (
    <Section id="scale" number="06" label="The Opportunity">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-8">
            WITH THE RIGHT<br />
            PARTNER,<br />
            <span style={{ color: "var(--blood)" }}>WE SCALE FAST.</span>
          </h2>
          <div className="space-y-2">
            {items.map((t, i) => (
              <div key={i} className="flex items-center gap-5 py-3 border-b border-border">
                <span className="font-display text-2xl md:text-3xl w-10" style={{ color: "var(--blood)" }}>0{i + 1}</span>
                <span className="text-bone text-base md:text-lg">{t}</span>
                <ArrowUpRight className="w-5 h-5 ml-auto text-bone/30" />
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-square">
          <img src={musicVideo} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.85))" }} />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="font-brush text-xl md:text-2xl text-bone/80">Ready for</div>
            <div className="font-display text-4xl md:text-6xl leading-none heavy-shadow" style={{ color: "var(--blood)" }}>NATIONAL</div>
            <div className="font-display text-4xl md:text-6xl leading-none text-bone heavy-shadow">EXPOSURE.</div>
          </div>
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--blood)" }} />
            <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone">REC • 4K</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- PARTNERSHIP ---------- */

function Partner() {
  const opts = [
    { tag: "Option 01", title: "CONTENT LICENSING", body: "Pay per video for premium long-form content, interviews, and franchise series.", icon: Film },
    { tag: "Option 02", title: "DISTRIBUTION DEAL", body: "Partner to expand BWF reach across networks, platforms, and new markets.", icon: Globe },
    { tag: "Option 03", title: "UPFRONT INVESTMENT", body: "Capital injection to scale production, talent, and content velocity.", icon: TrendingUp },
  ];
  return (
    <Section id="partner" number="07" label="The Partnership">
      <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-12">
        THREE WAYS TO <span style={{ color: "var(--blood)" }}>RUN IT UP.</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {opts.map((o, i) => (
          <div
            key={i}
            className="relative flex flex-col p-7 border-2 overflow-hidden"
            style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <div
              className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: "var(--blood)" }}
            />
            <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-5" style={{ color: "var(--blood)" }}>{o.tag}</div>
            <o.icon className="w-10 h-10 mb-5 text-bone" strokeWidth={2} />
            <div className="font-display text-2xl md:text-3xl tracking-tight text-bone mb-3 leading-tight">{o.title}</div>
            <p className="text-bone/70 leading-relaxed text-sm md:text-base">{o.body}</p>
            <div className="mt-auto pt-6 flex items-center gap-2">
              <Handshake className="w-5 h-5" style={{ color: "var(--blood)" }} />
              <span className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/60">Open to discuss</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- WHY US ---------- */

function Why() {
  const reasons = [
    { icon: Trophy, title: "PROVEN VIRAL SUCCESS", body: "686M+ views isn't theory — it's a track record." },
    { icon: Users, title: "DIRECT ARTIST ACCESS", body: "Trusted relationships across the hip-hop ecosystem." },
    { icon: Flame, title: "STRONG REGIONAL INFLUENCE", body: "Deep cultural roots in the South & beyond." },
    { icon: Sparkles, title: "CONSISTENT OUTPUT", body: "We don't go quiet. New drops, every week." },
  ];
  return (
    <Section id="why" number="08" label="The Edge">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-6xl md:text-8xl leading-[0.85] text-bone heavy-shadow mb-6">
            WHY <span style={{ color: "var(--blood)" }}>US?</span>
          </h2>
          <p className="text-bone/70 text-base md:text-lg leading-relaxed max-w-md mb-8">
            Anyone can shoot video. Few can move culture. We've been doing it long enough to know exactly which lane we own.
          </p>
          <div className="inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <span className="font-display text-2xl md:text-3xl tracking-tight" style={{ color: "var(--blood)" }}>
              WE CONTROL A CULTURE LANE.
            </span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="p-6 border-2"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div className="w-11 h-11 rounded flex items-center justify-center mb-4" style={{ backgroundColor: "var(--blood)" }}>
                <r.icon className="w-5 h-5 text-bone" strokeWidth={2.5} />
              </div>
              <div className="font-display text-lg md:text-xl tracking-tight text-bone leading-tight mb-2">{r.title}</div>
              <div className="text-bone/65 text-sm leading-relaxed">{r.body}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- VISION ---------- */

function Vision() {
  const pillars = [
    { n: "01", h: "TOP HIP-HOP", s: "Media Platform" },
    { n: "02", h: "ARTIST", s: "Discovery Hub" },
    { n: "03", h: "CULTURAL", s: "Authority" },
  ];
  return (
    <Section id="vision" number="09" label="The Future">
      <div className="text-center flex flex-col items-center">
        <h2 className="font-display text-6xl md:text-[7rem] leading-[0.85] text-bone heavy-shadow max-w-5xl">
          THE FUTURE OF<br />
          <span style={{ color: "var(--blood)" }}>BWF MEDIA.</span>
        </h2>
        <div className="mt-12 grid sm:grid-cols-3 gap-8 md:gap-10 max-w-5xl w-full">
          {pillars.map((p, i) => (
            <div
              key={i}
              className="border-t-2 pt-6 text-left"
              style={{ borderColor: "var(--blood)" }}
            >
              <div className="font-display text-3xl md:text-4xl mb-2" style={{ color: "var(--blood)" }}>{p.n}</div>
              <div className="font-display text-2xl md:text-3xl text-bone tracking-tight leading-tight">{p.h}</div>
              <div className="font-cond text-bone/60 tracking-widest text-sm uppercase mt-1">{p.s}</div>
            </div>
          ))}
        </div>
        <p className="mt-12 font-brush text-3xl md:text-4xl text-bone">
          A <span style={{ color: "var(--blood)" }}>next-generation</span> media company.
        </p>
      </div>
    </Section>
  );
}

/* ---------- CONTACT ---------- */

function Contact() {
  const contacts = [
    { icon: Mail, label: "Email", value: "bookbwfmediatv@mail.com", href: "mailto:bookbwfmediatv@mail.com", external: false },
    { icon: Instagram, label: "Instagram", value: "@bwfmediatv", href: "https://instagram.com/bwfmediatv", external: true },
    { icon: Youtube, label: "YouTube", value: "@bwfmedia", href: "https://youtube.com/@bwfmedia", external: true },
  ];
  return (
    <Section id="contact" number="10" label="Let's Talk">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-6xl md:text-[7rem] leading-[0.85] text-bone heavy-shadow">
            LET'S BUILD<br />
            <span style={{ color: "var(--blood)" }}>SOMETHING</span><br />
            BIG.
          </h2>
          <p className="mt-6 text-bone/70 text-base md:text-lg max-w-md leading-relaxed">
            The numbers are real. The audience is real. The opportunity is now. Lock it in.
          </p>
        </div>
        <div className="space-y-4">
          {contacts.map((c, i) => (
            <a
              key={i}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noreferrer" : undefined}
              className="flex items-center gap-5 p-5 border-2 group hover:border-blood transition-all"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--blood)" }}>
                <c.icon className="w-6 h-6 text-bone" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/60">{c.label}</div>
                <div className="font-display text-lg md:text-2xl text-bone tracking-tight mt-1 truncate">{c.value}</div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-bone/40 group-hover:text-blood transition-colors flex-shrink-0" />
            </a>
          ))}
          <div
            className="mt-6 p-6 text-center border-2"
            style={{ borderColor: "var(--blood)", backgroundColor: "var(--blood)" }}
          >
            <div className="font-display text-2xl md:text-4xl tracking-tight text-bone heavy-shadow">
              SERIOUS INQUIRIES ONLY.
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- FOOTER ---------- */

function Footer() {
  return (
    <footer className="relative bg-black border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-7 h-7 object-contain" />
          <span className="font-display text-lg tracking-tight text-bone">
            BWF MEDIA <span style={{ color: "var(--blood)" }}>TV</span>
          </span>
        </div>
        <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/40">
          © {new Date().getFullYear()} BWF Media TV — Where Culture Goes Viral
        </div>
      </div>
    </footer>
  );
}

/* ---------- PAGE ---------- */

export function OnePager() {
  return (
    <div className="bg-black text-bone">
      <Nav />
      <Hero />
      <Shift />
      <Proof />
      <Engine />
      <Audience />
      <Revenue />
      <Scale />
      <Partner />
      <Why />
      <Vision />
      <Contact />
      <Footer />
    </div>
  );
}
