import { motion } from "framer-motion";
import { Trophy, Compass, Users, TrendingUp, DollarSign, ArrowRight, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";

const artistFeatures = [
  {
    icon: Trophy,
    title: "Compete. Get Heard. Rise.",
    description:
      "Put your music head-to-head against other artists, earn fan votes, climb rankings, and gain visibility through real audience engagement.",
    gradient: "from-[#FF00A6] to-[#C53DFF]",
    shadow: "rgba(255,0,166,0.35)",
  },
  {
    icon: Compass,
    title: "Give Your Music a Chance to Break Through.",
    description:
      "Get discovered through Play Arena, trending tracks, featured placements, rankings, and community-powered discovery.",
    gradient: "from-[#C53DFF] to-[#00E6FF]",
    shadow: "rgba(197,61,255,0.35)",
  },
  {
    icon: Users,
    title: "Turn Listeners Into Supporters.",
    description:
      "Build relationships with fans who follow your journey, support your releases, vote in competitions, and grow with you.",
    gradient: "from-[#00E6FF] to-[#004BFF]",
    shadow: "rgba(0,230,255,0.35)",
  },
  {
    icon: TrendingUp,
    title: "Understand Your Growth.",
    description:
      "Track plays, followers, votes, engagement trends, and Play Arena performance to understand what connects with your audience.",
    gradient: "from-[#004BFF] to-[#C53DFF]",
    shadow: "rgba(0,75,255,0.35)",
  },
  {
    icon: DollarSign,
    title: "More Ways to Grow Your Career.",
    description:
      "Create new opportunities through artist memberships, promotions, live events, sponsorships, merchandise integrations, and future monetization tools.",
    gradient: "from-[#C53DFF] via-[#FF00A6] to-[#00E6FF]",
    shadow: "rgba(197,61,255,0.35)",
  },
];

export function ForArtistsSection() {
  return (
    <section id="for-artists" className="relative px-5 sm:px-10 py-24 sm:py-32 overflow-hidden">
      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur-md mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#C53DFF] animate-pulse" aria-hidden="true" />
            For Independent Artists
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]"
          >
            Built for Artists.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#C53DFF,#FF00A6)" }}
            >
              Powered by Fans.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-5 text-base sm:text-lg text-white/65 max-w-2xl mx-auto leading-relaxed"
          >
            Tunevio helps independent artists get discovered, compete in Play Arena, build real fan communities, and unlock new opportunities beyond traditional streaming.
          </motion.p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {artistFeatures.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:-translate-y-1 focus-within:border-white/20 focus-within:bg-white/[0.07]"
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(500px circle at 50% 0%, ${feature.shadow}, transparent 40%)`,
                }}
                aria-hidden="true"
              />

              <div
                className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-5`}
                style={{ boxShadow: `0 8px 24px -6px ${feature.shadow}` }}
              >
                <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>

              <h3 className="relative text-lg font-bold text-white mb-2 leading-snug">
                {feature.title}
              </h3>
              <p className="relative text-sm text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>

        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 sm:mt-24 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-8 sm:p-12 backdrop-blur-xl text-center relative overflow-hidden"
        >
          {/* Ambient glow behind banner */}
          <div className="absolute inset-0 pointer-events-none opacity-30" aria-hidden="true">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#C53DFF] blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#00E6FF] blur-[100px]" />
          </div>

          <div className="relative z-10">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
              Ready to Put Your Music in the Spotlight?
            </h3>
            <p className="mt-4 text-white/65 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
              Join Tunevio and use fan engagement, competition, and community to grow your audience.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#tunevio-hero"
                className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-8 py-4 font-semibold text-black transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#00E6FF] focus:ring-offset-2 focus:ring-offset-black"
                style={{ background: "linear-gradient(90deg,#C53DFF,#00E6FF)" }}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload Your Music
              </a>
              <Link
                to="/play"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-md transition hover:bg-white/10 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black"
              >
                Explore Play Arena
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
