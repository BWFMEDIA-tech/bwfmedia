import { SlideShell } from "./SlideShell";
import { motion } from "framer-motion";
import camera from "@/assets/camera.png";
import viralThumbs from "@/assets/viral-thumbs.jpg";
import audience from "@/assets/audience.jpg";
import musicVideo from "@/assets/music-video.jpg";
import bwfLogo from "@/assets/bwf-logo.jpg";
import {
  Play,
  Mic,
  Film,
  Smartphone,
  Flame,
  TrendingUp,
  Users,
  DollarSign,
  Globe,
  Handshake,
  Trophy,
  Sparkles,
  Mail,
  Instagram,
  Youtube,
  ArrowUpRight,
} from "lucide-react";

const TOTAL = 11;

/* ================= SLIDE 1, COVER ================= */
export function Slide1() {
  return (
    <SlideShell number={1} total={TOTAL} label="Investor Deck / 2026">
      <div className="flex-1 flex flex-col items-center justify-center px-16 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="flex items-center gap-4 mb-8"
        >
          <div
            className="flex items-center justify-center w-14 h-10 rounded"
            style={{ backgroundColor: "var(--blood)" }}
          >
            <Play className="w-5 h-5 fill-bone text-bone" />
          </div>
          <span className="font-cond font-bold tracking-[0.4em] text-sm uppercase text-bone/70">YouTube Channel</span>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 blur-3xl opacity-40 -z-10" style={{ backgroundColor: "var(--blood)" }} />
          <img
            src={bwfLogo}
            alt="BWF Media TV"
            className="w-[420px] h-[420px] object-contain mix-blend-screen drop-shadow-[0_0_40px_rgba(220,38,38,0.4)]"
          />
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="font-display text-7xl tracking-tight text-bone heavy-shadow mt-2"
        >
          MEDIA <span style={{ color: "var(--blood)" }}>TV</span>
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-8 font-cond font-bold tracking-[0.3em] text-xl uppercase text-bone"
        >
          Real Content. Real People. <span style={{ color: "var(--blood)" }}>Real Views.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-12 flex items-center gap-12"
        >
          <Stat big="686M+" label="Views" />
          <div className="w-px h-20 bg-bone/20" />
          <Stat big="324K+" label="Subscribers" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-10 font-brush text-3xl text-bone/80"
        >
          Where Culture <span style={{ color: "var(--blood)" }}>Goes Viral</span>
        </motion.p>
        <motion.a
          href="https://youtube.com/@bwfmedia"
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-4 font-cond tracking-[0.3em] text-xs uppercase text-bone/50 hover:text-bone transition-colors"
        >
          youtube.com/@bwfmediatvtv
        </motion.a>
      </div>

      <img
        src={camera}
        alt=""
        className="absolute -right-24 -bottom-12 w-[420px] opacity-30 mix-blend-screen pointer-events-none"
        loading="eager"
      />
    </SlideShell>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="text-left">
      <div className="font-display text-7xl leading-none red-shadow" style={{ color: "var(--blood)" }}>
        {big}
      </div>
      <div className="font-cond font-bold tracking-[0.4em] text-xs uppercase text-bone/70 mt-2">{label}</div>
    </div>
  );
}

/* ================= SLIDE 2, ATTENTION ================= */
export function Slide2() {
  return (
    <SlideShell number={2} total={TOTAL} label="Problem">
      <div className="flex-1 grid grid-cols-2 gap-16 px-20 py-24 items-center">
        <div>
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-6"
            style={{ color: "var(--blood)" }}
          >
            01, The Attention
          </motion.div>
          <h2 className="font-display text-7xl leading-[0.9] text-bone heavy-shadow mb-10">
            HIP-HOP MEDIA
            <br />
            <span style={{ color: "var(--blood)" }}>IS CHANGING</span>
          </h2>
          <ul className="space-y-5 text-bone/85 text-lg">
            {[
              "Culture moves faster than mainstream media",
              "Viral moments break before major platforms catch on",
              "Audiences want raw, unfiltered, real content",
            ].map((t, i) => (
              <motion.li
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex gap-4 items-start"
              >
                <span className="block w-2 h-2 mt-3 rounded-full" style={{ backgroundColor: "var(--blood)" }} />
                <span>{t}</span>
              </motion.li>
            ))}
          </ul>

          <div
            className="mt-12 inline-block px-6 py-4 border-l-4"
            style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <span className="font-display text-3xl tracking-tight" style={{ color: "var(--blood)" }}>
              BWF MEDIA IS ALREADY THERE.
            </span>
          </div>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden">
          <img src={audience} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.85))" }}
          />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="font-brush text-2xl" style={{ color: "var(--blood)" }}>
              The next generation
            </div>
            <div className="font-display text-5xl text-bone leading-none mt-1">DOESN'T WAIT.</div>
          </div>
          <div
            className="absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--blood)" }}
          />
          <div className="absolute top-3 right-10 font-cond font-bold tracking-widest text-[10px] uppercase text-bone">
            LIVE
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 3, PROOF ================= */
export function Slide3() {
  return (
    <SlideShell number={4} total={TOTAL} label="Traction">
      <div className="flex-1 px-20 py-24 flex flex-col">
        <div className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-4" style={{ color: "var(--blood)" }}>
          02, Track Record
        </div>
        <h2 className="font-display text-7xl leading-[0.9] text-bone heavy-shadow mb-12">
          WE DON'T CHASE VIRAL -<br />
          <span style={{ color: "var(--blood)" }}>WE CREATE IT.</span>
        </h2>

        <div className="grid grid-cols-3 gap-8 mb-12">
          {[
            { big: "686M+", label: "TOTAL VIEWS", sub: "Across all platforms" },
            { big: "8M+", label: "MONTHLY VIEWS", sub: "Average reach" },
            { big: "324K+", label: "SUBSCRIBERS", sub: "Active community" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 * i }}
              className="relative border-l-4 pl-6 py-4"
              style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}
            >
              <div className="font-display text-7xl leading-none red-shadow" style={{ color: "var(--blood)" }}>
                {s.big}
              </div>
              <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone mt-3">{s.label}</div>
              <div className="text-bone/60 text-sm mt-1">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="relative flex-1 overflow-hidden border" style={{ borderColor: "var(--blood)" }}>
          <img src={viralThumbs} alt="Viral video stills" className="w-full h-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.85), transparent 40%)" }}
          />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <span className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/80">
              Featured viral hits
            </span>
            <span className="font-brush text-xl" style={{ color: "var(--blood)" }}>
              + 200 more
            </span>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 4, CONTENT ENGINE ================= */
export function Slide4() {
  const items = [
    { icon: Mic, title: "Interviews", desc: "1-on-1 viral conversations with artists, athletes, and culture-shakers." },
    { icon: Film, title: "Music Videos", desc: "HD productions that double as viral marketing assets." },
    { icon: Smartphone, title: "Viral Clips", desc: "Short-form cuts engineered for TikTok, Reels & Shorts." },
    { icon: Flame, title: "Street Content", desc: "Raw, unscripted moments straight from the culture." },
  ];
  return (
    <SlideShell number={3} total={TOTAL} label="Solution">
      <div className="flex-1 px-20 py-24 grid grid-cols-5 gap-12">
        <div className="col-span-2">
          <div
            className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-4"
            style={{ color: "var(--blood)" }}
          >
            03, Content Engine
          </div>
          <h2 className="font-display text-7xl leading-[0.9] text-bone heavy-shadow">
            ONE SHOOT.
            <br />
            <span style={{ color: "var(--blood)" }}>MULTIPLE</span>
            <br />
            VIRAL ASSETS.
          </h2>
          <p className="mt-8 text-bone/70 text-lg leading-relaxed max-w-sm">
            Every piece of content is engineered for distribution across YouTube, Shorts, Reels, TikTok, and IG, turning
            one shoot into a full media cycle.
          </p>
        </div>

        <div className="col-span-3 grid grid-cols-2 gap-5">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="relative p-7 border-2 group hover:border-blood transition-colors"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div
                className="w-14 h-14 flex items-center justify-center rounded mb-5"
                style={{ backgroundColor: "var(--blood)" }}
              >
                <it.icon className="w-7 h-7 text-bone" strokeWidth={2.5} />
              </div>
              <div className="font-display text-3xl text-bone tracking-tight mb-2">{it.title.toUpperCase()}</div>
              <div className="text-bone/60 text-sm leading-relaxed">{it.desc}</div>
              <div className="absolute top-4 right-4 font-cond text-xs tracking-widest text-bone/30">0{i + 1}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 5, AUDIENCE ================= */
export function Slide5() {
  return (
    <SlideShell number={5} total={TOTAL} label="Market">
      <div className="flex-1 grid grid-cols-2">
        <div className="relative">
          <img src={audience} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.95))" }}
          />
          <div className="absolute bottom-8 left-8">
            <div className="font-brush text-3xl text-bone">Culture is</div>
            <div className="font-display text-6xl leading-none" style={{ color: "var(--blood)" }}>
              WATCHING.
            </div>
          </div>
        </div>

        <div className="px-16 py-24 flex flex-col justify-center">
          <div
            className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-4"
            style={{ color: "var(--blood)" }}
          >
            04, Demographics
          </div>
          <h2 className="font-display text-6xl leading-[0.9] text-bone heavy-shadow mb-10">
            REAL AUDIENCE.
            <br />
            <span style={{ color: "var(--blood)" }}>REAL ENGAGEMENT.</span>
          </h2>

          <div className="space-y-6">
            {[
              { k: "AGE", v: "18 – 34", note: "Peak cultural buying power" },
              { k: "REGION", v: "United States", note: "Strong Southern influence" },
              { k: "INTEREST", v: "Hip-Hop & Street Culture", note: "Niche-deep, loyalty-high" },
              { k: "ENGAGEMENT", v: "Above category average", note: "Comments, shares, repeat views" },
            ].map((row, i) => (
              <motion.div
                key={i}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="grid grid-cols-[110px_1fr] gap-6 items-baseline pb-4 border-b border-border"
              >
                <span
                  className="font-cond font-bold tracking-[0.25em] text-xs uppercase"
                  style={{ color: "var(--blood)" }}
                >
                  {row.k}
                </span>
                <div>
                  <div className="font-display text-2xl text-bone tracking-tight">{row.v}</div>
                  <div className="text-bone/50 text-sm">{row.note}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div
            className="mt-10 inline-block px-6 py-4 border-l-4 self-start"
            style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <span className="font-display text-2xl tracking-tight" style={{ color: "var(--blood)" }}>
              THIS AUDIENCE DRIVES CULTURE.
            </span>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 6, MONETIZATION ================= */
export function Slide6() {
  const tiers = [
    {
      name: "LIVE INTERVIEW",
      price: "$500",
      deposit: "$250 deposit",
      icon: Mic,
      items: ["1-on-1 (up to 45 min)", "Promo on all platforms", "Live on YouTube", "Full edit + thumbnail"],
    },
    {
      name: "MUSIC VIDEO",
      price: "$900",
      deposit: "$400 deposit",
      icon: Film,
      items: ["HD production", "Up to 4hr shoot", "Pro camera + edit", "YouTube upload + promo"],
    },
    {
      name: "PROMO PACKAGE",
      price: "$300",
      deposit: "$150 deposit",
      icon: TrendingUp,
      items: ["Upload to BWF Media TV", "Shoutout in video", "Shorts clip 15-30s", "Title + thumbnail optimized"],
    },
    {
      name: "AD REVENUE",
      price: "Recurring",
      deposit: "YouTube Partner",
      icon: DollarSign,
      items: ["Monthly ad payout", "Sponsor integrations", "Brand deal pipeline", "Channel memberships"],
    },
  ];
  return (
    <SlideShell number={6} total={TOTAL} label="Model">
      <div className="flex-1 px-20 py-20 flex flex-col">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div
              className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-3"
              style={{ color: "var(--blood)" }}
            >
              05, Monetization
            </div>
            <h2 className="font-display text-7xl leading-[0.9] text-bone heavy-shadow">
              PROVEN <span style={{ color: "var(--blood)" }}>REVENUE</span> MODEL
            </h2>
          </div>
          <div className="text-right">
            <div className="font-brush text-2xl text-bone/70">4 active streams</div>
            <div
              className="font-cond font-bold tracking-[0.3em] text-xs uppercase mt-1"
              style={{ color: "var(--blood)" }}
            >
              Already generating
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5 flex-1">
          {tiers.map((t, i) => (
            <motion.div
              key={i}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="relative flex flex-col p-6 border-2"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "var(--blood)" }} />
              <t.icon className="w-8 h-8 mb-4" style={{ color: "var(--blood)" }} strokeWidth={2.5} />
              <div className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/70 mb-2">{t.name}</div>
              <div className="font-display text-5xl leading-none mb-1" style={{ color: "var(--blood)" }}>
                {t.price}
              </div>
              <div className="font-cond text-[10px] tracking-widest uppercase text-bone/50 mb-5">{t.deposit}</div>
              <ul className="space-y-2 mt-auto">
                {t.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-bone/75 text-xs leading-snug">
                    <span
                      className="block w-1 h-1 mt-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "var(--blood)" }}
                    />
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

/* ================= SLIDE 7, SCALE ================= */
export function Slide7() {
  return (
    <SlideShell number={8} total={TOTAL} label="Growth">
      <div className="flex-1 grid grid-cols-2 gap-16 px-20 py-24 items-center">
        <div>
          <div
            className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-4"
            style={{ color: "var(--blood)" }}
          >
            06, Scale
          </div>
          <h2 className="font-display text-7xl leading-[0.9] text-bone heavy-shadow mb-10">
            WITH THE RIGHT
            <br />
            PARTNER,
            <br />
            <span style={{ color: "var(--blood)" }}>WE SCALE FAST.</span>
          </h2>
          <div className="space-y-4">
            {[
              "More high-profile interviews & exclusives",
              "Higher production quality across the board",
              "Consistent content series & franchise IP",
              "Expanded reach into new regional markets",
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="flex items-center gap-5 py-3 border-b border-border"
              >
                <span className="font-display text-3xl w-12" style={{ color: "var(--blood)" }}>
                  0{i + 1}
                </span>
                <span className="text-bone text-lg">{t}</span>
                <ArrowUpRight className="w-5 h-5 ml-auto text-bone/30" />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative aspect-square">
          <img src={musicVideo} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.85))" }}
          />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <div className="font-brush text-2xl text-bone/80">Ready for</div>
            <div className="font-display text-6xl leading-none heavy-shadow" style={{ color: "var(--blood)" }}>
              NATIONAL
            </div>
            <div className="font-display text-6xl leading-none text-bone heavy-shadow">EXPOSURE.</div>
          </div>
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--blood)" }} />
            <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone">REC • 4K</span>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 8, PARTNERSHIP ================= */
export function Slide8() {
  const opts = [
    {
      tag: "Option 01",
      title: "CONTENT LICENSING",
      body: "Pay per video for premium long-form content, interviews, and franchise series.",
      icon: Film,
    },
    {
      tag: "Option 02",
      title: "DISTRIBUTION DEAL",
      body: "Partner to expand BWF reach across networks, platforms, and new markets.",
      icon: Globe,
    },
    {
      tag: "Option 03",
      title: "UPFRONT INVESTMENT",
      body: "Capital injection to scale production, talent, and content velocity.",
      icon: TrendingUp,
    },
  ];
  return (
    <SlideShell number={9} total={TOTAL} label="Financials">
      <div className="flex-1 px-20 py-24 flex flex-col">
        <div className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-4" style={{ color: "var(--blood)" }}>
          07, How We Work Together
        </div>
        <h2 className="font-display text-7xl leading-[0.9] text-bone heavy-shadow mb-12">
          THREE WAYS TO <span style={{ color: "var(--blood)" }}>RUN IT UP.</span>
        </h2>

        <div className="grid grid-cols-3 gap-6 flex-1">
          {opts.map((o, i) => (
            <motion.div
              key={i}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.12 }}
              className="relative flex flex-col p-8 border-2 overflow-hidden group"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div
                className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity"
                style={{ backgroundColor: "var(--blood)" }}
              />
              <div
                className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-6"
                style={{ color: "var(--blood)" }}
              >
                {o.tag}
              </div>
              <o.icon className="w-12 h-12 mb-6 text-bone" strokeWidth={2} />
              <div className="font-display text-3xl tracking-tight text-bone mb-4 leading-tight">{o.title}</div>
              <p className="text-bone/70 leading-relaxed">{o.body}</p>
              <div className="mt-auto pt-8 flex items-center gap-2">
                <Handshake className="w-5 h-5" style={{ color: "var(--blood)" }} />
                <span className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/60">
                  Open to discuss
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 9, WHY US ================= */
export function Slide9() {
  const reasons = [
    { icon: Trophy, title: "PROVEN VIRAL SUCCESS", body: "686M+ views isn't theory, it's a track record." },
    { icon: Users, title: "DIRECT ARTIST ACCESS", body: "Trusted relationships across the hip-hop ecosystem." },
    { icon: Flame, title: "STRONG REGIONAL INFLUENCE", body: "Deep cultural roots in the South & beyond." },
    { icon: Sparkles, title: "CONSISTENT OUTPUT", body: "We don't go quiet. New drops, every week." },
  ];
  return (
    <SlideShell number={7} total={TOTAL} label="Advantage">
      <div className="flex-1 px-20 py-24 grid grid-cols-2 gap-16 items-center">
        <div>
          <div
            className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-4"
            style={{ color: "var(--blood)" }}
          >
            08, The Edge
          </div>
          <h2 className="font-display text-8xl leading-[0.85] text-bone heavy-shadow mb-8">
            WHY <span style={{ color: "var(--blood)" }}>US?</span>
          </h2>
          <p className="text-bone/70 text-lg leading-relaxed max-w-md mb-10">
            Anyone can shoot video. Few can move culture. We've been doing it long enough to know exactly which lane we
            own.
          </p>
          <div
            className="inline-block px-7 py-5 border-l-4"
            style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <span className="font-display text-3xl tracking-tight" style={{ color: "var(--blood)" }}>
              WE CONTROL A CULTURE LANE.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {reasons.map((r, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 border-2"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div
                className="w-12 h-12 rounded flex items-center justify-center mb-4"
                style={{ backgroundColor: "var(--blood)" }}
              >
                <r.icon className="w-6 h-6 text-bone" strokeWidth={2.5} />
              </div>
              <div className="font-display text-xl tracking-tight text-bone leading-tight mb-2">{r.title}</div>
              <div className="text-bone/65 text-sm leading-relaxed">{r.body}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 10, VISION ================= */
export function Slide10() {
  return (
    <SlideShell number={11} total={TOTAL} label="Vision">
      <div className="flex-1 flex flex-col items-center justify-center px-20 text-center relative">
        <div className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-6" style={{ color: "var(--blood)" }}>
          09, The Future
        </div>
        <motion.h2
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="font-display text-[7rem] leading-[0.85] text-bone heavy-shadow max-w-5xl"
        >
          THE FUTURE OF
          <br />
          <span style={{ color: "var(--blood)" }}>BWF MEDIA.</span>
        </motion.h2>

        <div className="mt-14 grid grid-cols-3 gap-10 max-w-5xl">
          {[
            { n: "01", h: "TOP HIP-HOP", s: "Media Platform" },
            { n: "02", h: "ARTIST", s: "Discovery Hub" },
            { n: "03", h: "CULTURAL", s: "Authority" },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="border-t-2 pt-6"
              style={{ borderColor: "var(--blood)" }}
            >
              <div className="font-display text-4xl mb-2" style={{ color: "var(--blood)" }}>
                {p.n}
              </div>
              <div className="font-display text-3xl text-bone tracking-tight leading-tight">{p.h}</div>
              <div className="font-cond text-bone/60 tracking-widest text-sm uppercase mt-1">{p.s}</div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-16 font-brush text-4xl text-bone"
        >
          A <span style={{ color: "var(--blood)" }}>next-generation</span> media company.
        </motion.p>
      </div>
    </SlideShell>
  );
}

/* ================= SLIDE 11, CLOSE ================= */
export function Slide11() {
  return (
    <SlideShell number={10} total={TOTAL} label="Ask">
      <div className="flex-1 grid grid-cols-2 gap-16 px-20 py-24 items-center">
        <div>
          <div
            className="font-cond font-bold tracking-[0.4em] text-sm uppercase mb-6"
            style={{ color: "var(--blood)" }}
          >
            10, Contact
          </div>
          <h2 className="font-display text-[7rem] leading-[0.85] text-bone heavy-shadow">
            LET'S BUILD
            <br />
            <span style={{ color: "var(--blood)" }}>SOMETHING</span>
            <br />
            BIG.
          </h2>
          <p className="mt-8 text-bone/70 text-lg max-w-md leading-relaxed">
            The numbers are real. The audience is real. The opportunity is now. Lock it in.
          </p>
        </div>

        <div className="space-y-5">
          {[
            { icon: Mail, label: "Email", value: "bookbwfmediatv@mail.com" },
            { icon: Instagram, label: "Instagram", value: "@bwfmediatv" },
            { icon: Youtube, label: "YouTube", value: "@bwfmediatv" },
          ].map((c, i) => (
            <motion.a
              key={i}
              href={
                c.label === "Email"
                  ? "mailto:bookbwfmediatv@mail.com"
                  : c.label === "Instagram"
                    ? "https://instagram.com/bwfmediatv"
                    : "https://youtube.com/@bwfmediatvtv"
              }
              target={c.label === "Email" ? undefined : "_blank"}
              rel={c.label === "Email" ? undefined : "noreferrer"}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-6 p-6 border-2 group hover:border-blood transition-all"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div
                className="w-14 h-14 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--blood)" }}
              >
                <c.icon className="w-7 h-7 text-bone" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone/60">{c.label}</div>
                <div className="font-display text-2xl text-bone tracking-tight mt-1">{c.value}</div>
              </div>
              <ArrowUpRight className="w-6 h-6 text-bone/40 group-hover:text-blood transition-colors" />
            </motion.a>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 p-6 text-center border-2"
            style={{ borderColor: "var(--blood)", backgroundColor: "var(--blood)" }}
          >
            <div className="font-display text-4xl tracking-tight text-bone heavy-shadow">SERIOUS INQUIRIES ONLY.</div>
          </motion.div>
        </div>
      </div>
    </SlideShell>
  );
}

// Pitch flow: Cover → Problem → Solution → Traction → Market → Model → Advantage → Growth → Financials → Ask → Vision
export const SLIDES = [Slide1, Slide2, Slide4, Slide3, Slide5, Slide6, Slide9, Slide7, Slide8, Slide11, Slide10];
