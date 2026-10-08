import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Coins,
  Compass,
  HeartHandshake,
  Megaphone,
  MessagesSquare,
  Music2,
  Radio,
  Rocket,
  Swords,
  Trophy,
  Users,
  Video,
  Vote,
} from "lucide-react";

type Capability = {
  icon: LucideIcon;
  title: string;
  blurb: string;
};

const CAPABILITIES: Capability[] = [
  {
    icon: Music2,
    title: "Artist Music Submission",
    blurb: "Artists can submit their tracks directly to the platform.",
  },
  {
    icon: Radio,
    title: "Live Music Playback",
    blurb: "Everyone in the Arena can hear the same track simultaneously in real time.",
  },
  {
    icon: Swords,
    title: "1-vs-1 Artist Battles",
    blurb: "Artists compete head-to-head by playing their music for a live audience.",
  },
  {
    icon: Vote,
    title: "Live Voting",
    blurb: "Audiences can vote on which artist they think should win.",
  },
  {
    icon: Trophy,
    title: "Tournaments",
    blurb: "Artists can compete through multiple rounds and advance toward a championship.",
  },
  {
    icon: MessagesSquare,
    title: "Live Chat & Reactions",
    blurb: "Viewers can communicate and react while the music is playing.",
  },
  {
    icon: Users,
    title: "Hosts & Guests",
    blurb:
      "Hosts can bring artists, influencers, industry professionals, and other guests into live rooms.",
  },
  {
    icon: Compass,
    title: "Artist Discovery",
    blurb: "Creates opportunities for audiences to discover new and independent artists.",
  },
  {
    icon: Building2,
    title: "Branded Events",
    blurb:
      "Businesses can create sponsored showcases, competitions, launches, interviews, and recurring shows.",
  },
  {
    icon: Megaphone,
    title: "Interactive Marketing",
    blurb:
      "Brands can engage directly with audiences instead of simply displaying advertisements.",
  },
  {
    icon: Video,
    title: "Content Creation",
    blurb:
      "Live sessions, battles, interviews, and events can become additional promotional content.",
  },
  {
    icon: Rocket,
    title: "Artist Promotion",
    blurb:
      "Gives artists another way to get their music heard, build an audience, and compete for attention.",
  },
  {
    icon: HeartHandshake,
    title: "Community Building",
    blurb:
      "Connects artists, fans, hosts, creators, and brands in one interactive ecosystem.",
  },
  {
    icon: Coins,
    title: "Monetization Opportunities",
    blurb:
      "Creates opportunities around memberships, promotions, voting/boosting, live events, and artist participation.",
  },
];

export function PlatformCapabilities({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="platform-capabilities-heading"
      className={`rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-md ${className}`}
    >
      <p className="font-cond text-[10px] font-bold uppercase tracking-[0.3em] text-blood">
        Tunevio
      </p>
      <h2
        id="platform-capabilities-heading"
        className="mt-2 font-display text-2xl uppercase leading-[0.95] text-bone"
      >
        What the{" "}
        <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-blood)" }}>
          Platform
        </span>{" "}
        Will Do
      </h2>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {CAPABILITIES.map(({ icon: Icon, title, blurb }) => (
          <li key={title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blood/30 bg-white/5"
              style={{ boxShadow: "0 0 18px color-mix(in srgb, var(--brand-cyan) 18%, transparent)" }}
            >
              <Icon className="h-4 w-4 text-blood" />
            </span>
            <span>
              <span className="block font-cond text-xs font-bold uppercase tracking-[0.16em] text-bone">
                {title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-bone/60">{blurb}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
