import { motion, MotionConfig } from "framer-motion";
import {
  Mic2,
  Headphones,
  Radio,
  Music2,
  Users,
  Swords,
  Store,
  Bell,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";
import tunevioLogo from "@/assets/tunevio-logo.png.asset.json";
import playArena1v1 from "@/assets/play-arena-1v1-battle.png.asset.json";

function trackCta(label: string) {
  try {
    (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.(
      "trackCustom",
      "TunevioLandingCta",
      { label },
    );
  } catch {
    /* analytics is optional */
  }
}

const roles = [
  {
    icon: Mic2,
    title: "Artists",
    points: [
      "Upload and showcase your music",
      "Build an artist profile and grow a following",
      "Follow other artists and connect with fans",
      "Go live and compete in music battles",
      "Showcase merchandise and artist products",
    ],
    cta: "Join as an Artist",
    href: "/signup?as=artist",
  },
  {
    icon: Headphones,
    title: "Listeners",
    points: [
      "Discover independent artists and music",
      "Listen to available tracks",
      "Follow artists and get activity updates",
      "Join live sessions and interact with the community",
      "Vote and react in eligible battles",
    ],
    cta: "Join as a Listener",
    href: "/signup?as=listener",
  },
  {
    icon: Radio,
    title: "Hosts",
    points: [
      "Host live music discussions and events",
      "Facilitate artist and listener engagement",
      "Support eligible battles and community events",
      "Access hosting tools and compensation opportunities where configured",
    ],
    cta: "Join as a Host",
    href: "/signup?as=host",
  },
];

const features = [
  {
    icon: Music2,
    title: "Music Discovery & Streaming",
    desc: "Stream tracks from independent artists and find your next favorite sound.",
  },
  {
    icon: Users,
    title: "Artist Profiles & Following",
    desc: "Follow artists, explore their catalogs, and stay close to the music you love.",
  },
  {
    icon: Radio,
    title: "Interactive Live Streaming",
    desc: "Join live sessions with shared playback, chat, and real-time energy.",
  },
  {
    icon: Swords,
    title: "Tunevio Battle Arena",
    desc: "Head-to-head artist competitions with live reactions and audience voting.",
  },
  {
    icon: Store,
    title: "Artist Stores & Merchandise",
    desc: "Support artists directly through their official stores and products.",
  },
  {
    icon: Bell,
    title: "Community & Notifications",
    desc: "Messages, announcements, and updates that keep the community connected.",
  },
];

const steps = [
  {
    title: "Choose how you want to participate",
    desc: "Artist, listener, or host — pick the path that fits you.",
  },
  {
    title: "Create an account or sign in",
    desc: "It’s free to start. Optional plans unlock more when you need them.",
  },
  {
    title: "Dive in",
    desc: "Discover music, connect with the community, and use the features available to your account.",
  },
];

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
    <div className="tunevio-welcome min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-5">
        <a href="/" className="flex items-center gap-3" aria-label="Tunevio home">
          <img
            src={tunevioLogo.url}
            alt="Tunevio"
            className="h-10 sm:h-12 w-auto "
          />
        </a>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
          <Button asChild variant="outline" className="welcome-action"><a
            href="/login"
            className="rounded-full border border-foreground/15 px-4 py-2 text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            Sign In
          </a></Button>
          <Button asChild variant="outline" className="welcome-action"><a
            href="/signup"
            onClick={() => trackCta("header-signup")}
            className="rounded-full bg-foreground px-4 py-2 text-xs sm:text-sm font-semibold text-background hover:bg-foreground/85 transition-colors"
          >
            Sign Up
          </a></Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative px-5 sm:px-10 pt-8 pb-20 sm:pt-14 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            src={heroRapperVideo.url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/65 to-background" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-foreground/5 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Tunevio, brought to you by BWFMEDIA
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-normal leading-[1.05]"
          >
            Music Is Better When{" "}
            <span className="text-primary">You’re Part of It.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Discover independent artists. Join live music experiences. Compete
            in battles. Build your audience. Tunevio brings artists and music
            fans together in one interactive platform.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button asChild variant="outline" className="welcome-action"><a
              href="/signup"
              onClick={() => trackCta("hero-join")}
              className="welcome-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 font-semibold text-foreground hover:bg-primary/85 transition-colors"
            >
              Join Tunevio — It’s Free to Start
              <ArrowRight className="h-4 w-4" />
            </a></Button>
            <Button asChild variant="outline" className="welcome-action"><a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 px-8 py-3.5 font-semibold text-foreground/85 hover:border-foreground/50 hover:text-foreground transition-colors"
            >
              Explore How It Works
            </a></Button>
          </motion.div>
        </div>
      </section>

      {/* Three user pathways */}
      <section className="relative px-5 sm:px-10 pb-24" aria-labelledby="roles-heading">
        <div className="mx-auto max-w-6xl">
          <h2
            id="roles-heading"
            className="text-center text-3xl sm:text-4xl font-bold tracking-normal"
          >
            One Platform. <span className="text-primary">Three Ways In.</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {roles.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex flex-col rounded-lg border border-border bg-card p-6 sm:p-8  hover:border-primary/50 transition-colors"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <role.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-5 text-2xl font-bold">{role.title}</h3>
                <ul className="mt-4 space-y-2.5 flex-1">
                  {role.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="welcome-action welcome-primary mt-6 h-auto"><a
                  href={role.href}
                  onClick={() => trackCta(`role-${role.title.toLowerCase()}`)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:bg-foreground/85 transition-colors"
                >
                  {role.cta}
                  <ArrowRight className="h-4 w-4" />
                </a></Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Battle Arena highlight */}
      <section className="relative px-5 sm:px-10 pb-24">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-foreground/5 px-3 py-1 text-xs text-muted-foreground">
              <Swords className="h-3.5 w-3.5 text-primary" />
              <span>Live Battles</span>
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-bold tracking-normal">
              The Battle Arena
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xl">
              Artists go head-to-head in live music battles while the audience
              votes to decide the winner. Replays stay up for 24 hours so
              nobody misses the moment.
            </p>
          </motion.div>
          <motion.img
            src={playArena1v1.url}
            alt="Two artists in a live head-to-head music battle on Tunevio"
            loading="lazy"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="w-full rounded-lg border border-border "
          />
        </div>
      </section>

      {/* Feature showcase */}
      <section className="relative px-5 sm:px-10 pb-24" aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2
              id="features-heading"
              className="text-3xl sm:text-5xl font-bold tracking-normal"
            >
              Everything Happens <span className="text-primary">Here</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Real features, live today — streaming, battles, stores, and
              community in one place.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="rounded-lg border border-border bg-card p-6  hover:border-primary/40 transition-colors"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative px-5 sm:px-10 pb-24 scroll-mt-20"
        aria-labelledby="how-heading"
      >
        <div className="mx-auto max-w-4xl">
          <h2
            id="how-heading"
            className="text-center text-3xl sm:text-4xl font-bold tracking-normal"
          >
            How Tunevio Works
          </h2>
          <div className="mt-12 space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex items-start gap-5 rounded-lg border border-border bg-card p-6 "
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild variant="outline" className="welcome-action"><a
              href="/signup"
              onClick={() => trackCta("footer-join")}
              className="welcome-primary inline-flex items-center justify-center gap-2 rounded-full bg-primary px-10 py-4 font-semibold text-foreground hover:bg-primary/85 transition-colors"
            >
              Join Tunevio — It’s Free to Start
              <ArrowRight className="h-4 w-4" />
            </a></Button>
            <p className="mt-3 text-xs text-foreground/50">
              Free to start. Optional paid plans are explained on our{" "}
              <a href="/pricing" className="underline hover:text-foreground/80">
                pricing page
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border px-5 sm:px-10 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={tunevioLogo.url} alt="Tunevio" className="h-8 w-auto" />
            <span className="text-xs text-foreground/50">
              Tunevio, brought to you by BWFMEDIA
            </span>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
            aria-label="Footer"
          >
            <a href="/blog" className="hover:text-foreground transition-colors">Blog</a>
            <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/acceptable-use" className="hover:text-foreground transition-colors">
              Acceptable Use
            </a>
          </nav>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
