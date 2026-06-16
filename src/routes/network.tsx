import { createFileRoute } from "@tanstack/react-router";
import { Link as RouterLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Radio,
  TrendingUp,
  DollarSign,
  Flame,
  Compass,
  Play,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "BWF Network | Music Streaming, Live Artist Battles & Monetization Platform" },
      {
        name: "description",
        content:
          "BWF Network is a next-generation music streaming platform for independent artists featuring live streaming, real-time rankings, fan engagement, and artist monetization tools.",
      },
      {
        name: "keywords",
        content:
          "music streaming platform, independent music platform, live music streaming, artist monetization platform, music discovery platform, creator economy platform, live artist battles, earn money from music",
      },
      { property: "og:title", content: "BWF Network | Music Streaming, Live Artist Battles & Monetization Platform" },
      {
        property: "og:description",
        content:
          "Discover, stream, and support independent artists through live music streaming, real-time rankings, and creator monetization tools.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/network" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/network" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is BWF Network?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A live music streaming and monetization platform for independent artists.",
              },
            },
            {
              "@type": "Question",
              name: "How do artists earn money?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Through tips, boosts, subscriptions, and merch sales.",
              },
            },
            {
              "@type": "Question",
              name: "Is it free for listeners?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, with optional premium features.",
              },
            },
            {
              "@type": "Question",
              name: "What is live ranking?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A real-time system that ranks artists based on engagement and boosts.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: NetworkPage,
});

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="block h-px w-10 bg-blood" />
      <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">
        {children}
      </span>
    </div>
  );
}

const features = [
  { icon: Radio, title: "Live Music Streaming", desc: "Real-time performance battles and broadcasted sessions from the home stage." },
  { icon: TrendingUp, title: "Real-Time Ranking Engine", desc: "Artists climb the board live as engagement and boosts come in." },
  { icon: DollarSign, title: "Creator Monetization", desc: "Tips, boosts, subscriptions, and merch — paid out in real time." },
  { icon: Flame, title: "Audience Voting", desc: "Crowd-powered reactions decide who advances and who gets the spotlight." },
  { icon: Compass, title: "Independent Discovery", desc: "Surface rising voices through a feed built for the next wave." },
  { icon: Sparkles, title: "Spotify × Twitch DNA", desc: "Streamed catalog meets live performance. One stage, one network." },
];

const faqs = [
  { q: "What is BWF Network?", a: "A live music streaming and monetization platform for independent artists." },
  { q: "How do artists earn money?", a: "Through tips, boosts, subscriptions, and merch sales — tracked and paid in real time." },
  { q: "Is it free for listeners?", a: "Yes, with optional premium features for deeper access and perks." },
  { q: "What is live ranking?", a: "A real-time system that ranks artists based on audience engagement and boost activity." },
];

function NetworkPage() {
  return (
    <main className="min-h-screen bg-black text-bone">
      {/* HERO */}
      <section className="relative w-full overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          src={heroRapperVideo.url}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black" />
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(60% 50% at 50% 30%, rgba(225,29,42,0.35), transparent 70%)" }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
          <div className="rounded-2xl overflow-hidden border border-blood/30 bg-black/40 backdrop-blur-md p-8 md:p-14">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blood/90 px-3 py-1 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="font-cond tracking-[0.3em] text-[10px] uppercase text-white font-bold">
                BWF Network
              </span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] uppercase text-bone">
              Independent Music.
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-blood)" }}
              >
                Live Monetization.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-bone/75 text-base md:text-lg leading-relaxed">
              Discover, stream, and support independent artists through live music streaming,
              real-time rankings, audience voting, and creator monetization tools.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <RouterLink
                to="/live"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors rounded-md"
              >
                <Play size={14} fill="currentColor" /> Watch Live
              </RouterLink>
              <RouterLink
                to="/artist-submission"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-blood/40 bg-blood/10 text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood/20 transition-colors rounded-md"
              >
                Join as Artist <ArrowRight size={14} />
              </RouterLink>
              <RouterLink
                to="/discover"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/20 bg-white/5 text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white/10 transition-colors rounded-md"
              >
                <Compass size={14} /> Discover
              </RouterLink>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS BWF NETWORK */}
      <section className="bg-black/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <Kicker>About</Kicker>
              <h2 className="font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95]">
                What is BWF Network?
              </h2>
              <p className="mt-5 text-bone/70 text-base md:text-lg leading-relaxed">
                BWF Network is a music streaming and creator economy platform designed for
                independent artists to grow, perform live, and monetize their audience through
                tips, boosts, subscriptions, and merch.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-black border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-24">
          <Reveal>
            <div className="max-w-3xl mb-12">
              <Kicker>The Platform</Kicker>
              <h2 className="font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95]">
                Live Streaming &
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-blood)" }}
                >
                  Creator Economy
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="group h-full rounded-2xl border border-white/10 bg-[#0d0d18] p-6 hover:border-blood/50 transition-colors">
                  <div className="w-11 h-11 rounded-lg bg-blood/10 border border-blood/30 grid place-items-center mb-5 group-hover:bg-blood/20 transition-colors">
                    <f.icon size={20} className="text-blood" />
                  </div>
                  <h3 className="font-display text-xl uppercase text-bone leading-tight">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-bone/65 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MONETIZATION */}
      <section className="bg-black/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-24 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <Reveal>
            <Kicker>Monetization</Kicker>
            <h2 className="font-display text-4xl md:text-6xl uppercase text-bone leading-[0.95]">
              Earn Money
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-blood)" }}
              >
                From Your Music.
              </span>
            </h2>
            <p className="mt-6 max-w-xl text-bone/70 text-base md:text-lg leading-relaxed">
              Artists earn through fan tips, live stream engagement, boost promotion,
              subscriptions, and merchandise sales — all tracked in real time.
            </p>
            <div className="mt-8">
              <RouterLink
                to="/artist-submission"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors rounded-md"
              >
                Start Earning <ArrowRight size={14} />
              </RouterLink>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Tips", icon: DollarSign },
                { label: "Boosts", icon: Flame },
                { label: "Subs", icon: Sparkles },
                { label: "Merch", icon: TrendingUp },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-white/10 bg-[#0d0d18] p-5 hover:border-blood/40 transition-colors"
                >
                  <m.icon size={18} className="text-blood mb-3" />
                  <div className="font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone/80">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHY */}
      <section className="bg-black border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <Kicker>Next Generation</Kicker>
              <h2 className="font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95]">
                The Next Generation
                <br />
                Music Platform.
              </h2>
              <p className="mt-5 text-bone/70 text-base md:text-lg leading-relaxed">
                Built as a hybrid of Spotify and Twitch, BWF Network is redefining how artists
                are discovered, ranked, and monetized in the creator economy.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-black/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-24">
          <Reveal>
            <div className="max-w-3xl mb-10">
              <Kicker>FAQ</Kicker>
              <h2 className="font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95]">
                Questions, Answered.
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4">
            {faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6 hover:border-blood/40 transition-colors h-full">
                  <h3 className="font-display text-lg uppercase text-bone leading-tight">
                    {f.q}
                  </h3>
                  <p className="mt-3 text-bone/65 text-sm leading-relaxed">{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="mt-14 rounded-2xl border border-blood/30 bg-gradient-to-r from-blood/10 via-black to-black p-8 md:p-10 flex flex-wrap items-center justify-between gap-6">
              <div>
                <Kicker>Get On Stage</Kicker>
                <h3 className="font-display text-2xl md:text-3xl uppercase text-bone leading-tight">
                  Ready to go live on BWF Network?
                </h3>
              </div>
              <RouterLink
                to="/artist-submission"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors rounded-md"
              >
                Submit Your Music <ChevronRight size={14} />
              </RouterLink>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}