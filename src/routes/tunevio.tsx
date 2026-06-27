import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import {
  Music2,
  DollarSign,
  Compass,
  Trophy,
  Smartphone,
  Sparkles,
  BadgeCheck,
  Rocket,
  Gift,
  CheckCircle2,
  Loader2,
  Youtube,
  Instagram,
  Swords,
  Vote,
  Radio,
  TrendingUp,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroVideo from "@/assets/hero-rapper.mp4.asset.json";
import micWalkupVideo from "@/assets/tunevio-mic-walkup-black.mp4.asset.json";
import tunevioLogo from "@/assets/tunevio-logo.png.asset.json";
import playArena1v1 from "@/assets/play-arena-1v1-battle.png.asset.json";


export const Route = createFileRoute("/tunevio")({
  head: () => ({
    meta: [
      { title: "Tunevio Early Access Waitlist" },
      {
        name: "description",
        content:
          "Join the Tunevio waitlist and be first to experience the future of music streaming.",
      },
      { property: "og:title", content: "Tunevio Early Access Waitlist" },
      {
        property: "og:description",
        content:
          "Join the Tunevio waitlist and be first to experience the future of music streaming.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfnetwork.com/tunevio" },
    ],
    links: [{ rel: "canonical", href: "https://bwfnetwork.com/tunevio" }],
  }),
  component: TunevioLanding,
  errorComponent: () => (
    <div className="min-h-screen bg-black text-white grid place-items-center p-8">
      Something went wrong.
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-black text-white grid place-items-center p-8">
      Not found.
    </div>
  ),
});

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email" })
  .max(255);

function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_waitlist_count");
      if (!cancelled && !error && typeof data === "number") setCount(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { count, setCount };
}

function WaitlistForm({
  onJoined,
  ctaLabel = "Get Early Access",
  source,
}: {
  onJoined: () => void;
  ctaLabel?: string;
  source: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setMessage(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setStatus("loading");
    setMessage("");
    const normalized = parsed.data.toLowerCase();
    const { error } = await supabase
      .from("waitlist_emails")
      .insert({ email: normalized, source });
    if (error) {
      // unique violation -> still treat as success for UX
      if ((error as { code?: string }).code === "23505") {
        setStatus("success");
        setMessage("You're already on the list 🎉");
        onJoined();
        return;
      }
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      return;
    }
    setStatus("success");
    setMessage("You're on the list 🎉");
    setEmail("");
    onJoined();
    try {
      // Lightweight analytics ping
      (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.(
        "trackCustom",
        "TunevioWaitlistSignup",
        { source },
      );
    } catch {
      /* noop */
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl text-center">
        <div className="flex items-center justify-center gap-2 text-[#00E6FF]">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">{message}</span>
        </div>
        <p className="mt-2 text-sm text-white/70">
          We'll email you the moment Tunevio is ready.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl shadow-[0_0_60px_-15px_rgba(197,61,255,0.5)]"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          className="flex-1 rounded-xl bg-black/40 px-4 py-3 text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-[#00E6FF] transition"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-black overflow-hidden disabled:opacity-70"
          style={{
            background: "linear-gradient(90deg,#C53DFF,#00E6FF)",
          }}
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {ctaLabel}
        </button>
      </div>
      {status === "error" && (
        <p className="px-3 pt-2 pb-1 text-sm text-[#FF00A6]">{message}</p>
      )}
    </form>
  );
}

const features = [
  {
    icon: Music2,
    title: "Artist-First Revenue",
    desc: "Higher payouts and transparent splits — built so creators win first.",
  },
  {
    icon: Compass,
    title: "Music Discovery That Works",
    desc: "Smarter recommendations powered by real listeners, not just algorithms.",
  },
  {
    icon: DollarSign,
    title: "Exclusive Artist Tools",
    desc: "Promotion, analytics, live rooms, and monetization in one place.",
  },
  {
    icon: Trophy,
    title: "Community Rankings",
    desc: "Rise up the charts through fan support, votes, and rewards.",
  },
  {
    icon: Smartphone,
    title: "Premium Mobile Experience",
    desc: "Designed mobile-first with a clean, futuristic, premium feel.",
  },
];

const perks = [
  { icon: BadgeCheck, title: "Founder Badge", desc: "Permanent badge on your profile." },
  { icon: Rocket, title: "Beta Access", desc: "Try Tunevio before the public." },
  { icon: Gift, title: "Exclusive Discounts", desc: "Launch-only subscription pricing." },
  { icon: Sparkles, title: "Launch Rewards", desc: "Bonus credits, perks & surprises." },
];

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function TunevioLanding() {
  const { count, setCount } = useWaitlistCount();
  const onJoined = () =>
    setCount((c) => (typeof c === "number" ? c + 1 : c));

  // Display a baseline so the counter feels alive even from day one
  const displayCount = (count ?? 0) + 4382;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#C53DFF]/30 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-[#00E6FF]/25 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-[#FF00A6]/20 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-5">
        <div className="flex items-center gap-2">
          <img
            src={tunevioLogo.url}
            alt="Tunevio"
            className="h-12 sm:h-14 w-auto drop-shadow-[0_0_25px_rgba(197,61,255,0.55)]"
          />
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-white/50">
          by BWF Media
        </span>
      </header>

      {/* 1. Hero */}
      <section className="relative px-5 sm:px-10 pt-10 pb-24 sm:pt-16 sm:pb-32 overflow-hidden">
        {/* Hero video background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            src={micWalkupVideo.url}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            src={tunevioLogo.url}
            alt="Tunevio"
            className="mx-auto mb-6 h-20 sm:h-28 w-auto drop-shadow-[0_0_40px_rgba(0,230,255,0.55)]"
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E6FF] animate-pulse" />
            Pre-launch · Early access open
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]"
          >
            The Future of{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#C53DFF,#00E6FF)" }}
            >
              Independent Music
            </span>{" "}
            Is Almost Here
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 text-base sm:text-lg text-white/70 max-w-2xl mx-auto"
          >
            Tunevio is a new music streaming platform built for artists and
            fans. Discover music, earn rewards, support creators, and be first
            to experience the next generation of streaming.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-10"
          >
            <WaitlistForm onJoined={onJoined} source="hero" />
            <p className="mt-4 text-sm text-white/60">
              <span className="font-semibold text-white">{fmt(displayCount)}</span>{" "}
              people already joined the waitlist
            </p>
            </motion.div>
          </div>
      </section>

      {/* 2. Social Proof */}
      <section className="relative px-5 sm:px-10 pb-20">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-10 backdrop-blur-xl">
          <p className="text-center text-white/70">
            Join the growing community waiting for launch.
          </p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              "Artist-first platform",
              "Premium music discovery",
              "Exclusive launch rewards",
              "Early beta access",
            ].map((t) => (
              <div
                key={t}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-4 text-center text-sm text-white/80"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2.5 Play Arena — Live Music Battles */}
      <section className="relative px-5 sm:px-10 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur-md">
                <Swords className="h-3.5 w-3.5 text-[#FF00A6]" />
                <span>Live Battles</span>
              </div>
              <h2 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight">
                Play Arena —{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg,#FF00A6,#00E6FF)" }}
                >
                  Live Music Battles
                </span>
              </h2>
              <p className="mt-4 text-base text-white/65 leading-relaxed max-w-xl">
                Play Arena is a real-time competition layer where artists go
                head-to-head in live music battles while audiences vote to decide
                the winner instantly.
              </p>
              <p className="mt-3 text-sm text-white/50 max-w-xl">
                No algorithm bias. No passive streaming. Just live performance and
                real outcomes.
              </p>

              <motion.img
                src={playArena1v1.url}
                alt="1v1 live music battle"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="mt-8 w-full max-w-xl rounded-2xl border border-white/10 shadow-[0_0_60px_-15px_rgba(255,0,166,0.45)]"
              />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Swords,
                  title: "Live 1v1 artist battles",
                  desc: "Two artists. One stage. Real-time clash.",
                },
                {
                  icon: Vote,
                  title: "Real-time audience voting",
                  desc: "Fans vote as the music plays.",
                },
                {
                  icon: Zap,
                  title: "Instant winner results",
                  desc: "Winners are called the moment the battle ends.",
                },
                {
                  icon: Radio,
                  title: "Host-controlled live arenas",
                  desc: "Curators run the show and keep energy high.",
                },
                {
                  icon: TrendingUp,
                  title: "Performance-based ranking",
                  desc: "Climb the leaderboard with every win.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl hover:border-[#FF00A6]/50 transition-colors"
                >
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: "linear-gradient(135deg,rgba(255,0,166,0.25),rgba(0,230,255,0.2))",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features */}
      <section className="relative px-5 sm:px-10 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              What Makes{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg,#C53DFF,#00E6FF)" }}
              >
                Tunevio
              </span>{" "}
              Different?
            </h2>
            <p className="mt-4 text-white/65">
              Built from the ground up around creators — not legacy labels.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl hover:border-[#C53DFF]/50 transition-colors"
              >
                <div
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background: "linear-gradient(135deg,rgba(197,61,255,0.25),rgba(0,230,255,0.2))",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Launch Incentives */}
      <section className="relative px-5 sm:px-10 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Early Access Members Receive
            </h2>
            <p className="mt-4 text-white/65">
              A thank-you for being here first.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {perks.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl text-center"
              >
                <div
                  className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg,#C53DFF,#00E6FF)",
                    boxShadow: "0 0 30px rgba(0,230,255,0.35)",
                  }}
                >
                  <p.icon className="h-5 w-5 text-black" />
                </div>
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-1 text-xs text-white/60">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Final CTA */}
      <section className="relative px-5 sm:px-10 pb-24">
        <div className="mx-auto max-w-4xl text-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 sm:p-14 backdrop-blur-xl">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Don't Miss{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#C53DFF,#00E6FF)" }}
            >
              Launch Day
            </span>
          </h2>
          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            Be among the first users to experience Tunevio before public release.
          </p>
          <div className="mt-8">
            <WaitlistForm
              onJoined={onJoined}
              ctaLabel="Join The Waitlist"
              source="final_cta"
            />
            <p className="mt-4 text-sm text-white/60">
              <span className="font-semibold text-white">{fmt(displayCount)}</span>{" "}
              already joined
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-5 sm:px-10 pb-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <div>© {new Date().getFullYear()} Tunevio · by BWF Media</div>
          <div className="flex items-center gap-4">
            <a
              href="https://youtube.com/@bwfmedia"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition"
            >
              <Youtube className="h-4 w-4" /> BWFMedia TV
            </a>
            <a
              href="https://instagram.com/bwfmediatv"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition"
            >
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}