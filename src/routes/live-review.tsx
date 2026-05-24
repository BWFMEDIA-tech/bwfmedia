import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  X,
  Star,
  Send,
  Instagram,
  Youtube,
  Radio,
  Music2,
  Mic,
  Lock,
  Check,
} from "lucide-react";
import { FutureShell, HUDFrame, GOLD, GOLD_GLOW } from "@/components/site/FutureShell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createLiveSubmissionCheckout } from "@/lib/live-submission-checkout.functions";
import { LIVE_TIER_LIST, LIVE_TIERS, type LiveTierId, type LiveTier } from "@/lib/live-review-tiers";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/live-review")({
  head: () => ({
    meta: [
      { title: "BWFMEDIA Live Review Room — Live Music Reviews & Audience Voting" },
      {
        name: "description",
        content:
          "Tap in to the BWFMEDIA Live Review Room. Watch the live stream, rate tracks, vote Hot or Not, and submit your music for review.",
      },
      { property: "og:title", content: "BWFMEDIA Live Review Room" },
      {
        property: "og:description",
        content:
          "Live music reviews, guest artists, and real-time audience ratings — second-screen experience for the BWFMEDIA YouTube Live show.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfmedia.company/live-review" },
    ],
    links: [{ rel: "canonical", href: "https://bwfmedia.company/live-review" }],
  }),
  component: LiveReviewPage,
});

// Replace with the actual live stream / channel embed. `live_stream` channel
// embed auto-loads the currently live broadcast.
const YT_CHANNEL_ID = "UC8_wxX0GLhTWNPXgv06YbUw";
const YT_LIVE_EMBED = `https://www.youtube.com/embed/live_stream?channel=${YT_CHANNEL_ID}&autoplay=0`;

type Comment = {
  id: string;
  name: string;
  text: string;
  rating?: number;
  vote?: "hot" | "not";
  at: number;
};

const SEED_COMMENTS: Comment[] = [
  { id: "c1", name: "DJ Prime", text: "That hook is undeniable 🔥", rating: 9, vote: "hot", at: Date.now() - 60_000 },
  { id: "c2", name: "Mona", text: "Beat slaps but the mix is muddy", rating: 6, at: Date.now() - 120_000 },
  { id: "c3", name: "Trey", text: "Replay value for daysss", vote: "hot", at: Date.now() - 180_000 },
  { id: "c4", name: "Kara", text: "Verse 2 needs work imo", rating: 5, vote: "not", at: Date.now() - 240_000 },
];

function LiveReviewPage() {
  // Review panel state
  const [rating, setRating] = useState<number | null>(null);
  const [vote, setVote] = useState<"hot" | "not" | null>(null);
  const [name, setName] = useState("");
  const [opinion, setOpinion] = useState("");
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS);

  // Submission form state
  const [submitting, setSubmitting] = useState(false);
  const [subArtist, setSubArtist] = useState("");
  const [subLink, setSubLink] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subMsg, setSubMsg] = useState("");
  const [selectedTier, setSelectedTier] = useState<LiveTierId | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!opinion.trim() && rating == null && !vote) {
      toast.error("Drop a rating, vote, or opinion first.");
      return;
    }
    const c: Comment = {
      id: crypto.randomUUID(),
      name: name.trim() || "Anonymous",
      text: opinion.trim() || (vote === "hot" ? "🔥 Hot" : vote === "not" ? "❌ Not" : "Rated"),
      rating: rating ?? undefined,
      vote: vote ?? undefined,
      at: Date.now(),
    };
    setComments((prev) => [c, ...prev]);
    setOpinion("");
    setRating(null);
    setVote(null);
    toast.success("Locked in. Your take is live.");
  }

  async function handleSubmitMusic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTier) {
      toast.error("Pick a tier to unlock submission.");
      return;
    }
    if (!subArtist.trim() || !subLink.trim() || !subEmail.trim()) {
      toast.error("Artist, link, and email are required.");
      return;
    }
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const { clientSecret } = await createLiveSubmissionCheckout({
        data: {
          tier: selectedTier,
          artistName: subArtist.trim(),
          email: subEmail.trim(),
          songLink: subLink.trim(),
          message: subMsg.trim(),
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/live-review/success?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      setClientSecret(clientSecret);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to start checkout";
      setCheckoutError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function resetCheckout() {
    setClientSecret(null);
    setCheckoutError(null);
  }

  return (
    <FutureShell>
      <PaymentTestModeBanner />
      <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 py-10 md:py-16">
        {/* HERO */}
        <section className="text-center mb-10 md:mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-[0.3em] border"
            style={{ borderColor: `${GOLD}66`, color: GOLD }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Live Now
          </div>
          <h1 className="mt-4 font-anton text-4xl sm:text-5xl md:text-7xl uppercase tracking-tight text-bone">
            BWFMEDIA{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${GOLD_GLOW}, ${GOLD})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Live Review Room
            </span>
          </h1>
          <p className="mt-4 text-bone/70 max-w-2xl mx-auto text-sm md:text-base">
            Live music reviews, guest artists, and real-time audience ratings. Pull up, vote, and shape what gets the cosign.
          </p>
        </section>

        {/* LIVE PLAYER */}
        <HUDFrame className="p-3 md:p-4 mb-8 md:mb-12">
          <div
            className="relative w-full aspect-video overflow-hidden bg-black"
            style={{ border: `1px solid ${GOLD}33` }}
          >
            <iframe
              src={YT_LIVE_EMBED}
              title="BWFMEDIA Live Review Room"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </HUDFrame>

        {/* GUEST SPOTLIGHT */}
        <section className="mb-8 md:mb-12">
          <SectionHeader
            eyebrow="Now Reviewing"
            title="Guest Artist Spotlight"
            icon={<Mic className="w-4 h-4" />}
          />
          <HUDFrame className="p-4 md:p-6 mt-4">
            <div className="flex flex-col sm:flex-row gap-5">
              <div
                className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden grid place-items-center"
                style={{
                  border: `1px solid ${GOLD}66`,
                  background: `radial-gradient(circle, ${GOLD}33, transparent 70%)`,
                }}
              >
                <Music2 className="w-10 h-10" style={{ color: GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] mb-2"
                  style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}66` }}
                >
                  Now Reviewing
                </div>
                <h3 className="font-anton text-2xl md:text-3xl uppercase tracking-wide text-bone">
                  TBA Artist
                </h3>
                <p className="text-bone/60 mt-1 text-sm">
                  Song: <span className="text-bone/90">"Untitled Heat"</span>
                </p>
                <div className="flex gap-2 mt-4">
                  <SocialPill icon={<Instagram className="w-3.5 h-3.5" />} label="Instagram" />
                  <SocialPill icon={<Youtube className="w-3.5 h-3.5" />} label="YouTube" />
                  <SocialPill icon={<Radio className="w-3.5 h-3.5" />} label="SoundCloud" />
                </div>
              </div>
            </div>
          </HUDFrame>
        </section>

        {/* LIVE REVIEW PANEL */}
        <section className="mb-8 md:mb-12">
          <SectionHeader
            eyebrow="Audience Verdict"
            title="Live Review Panel"
            icon={<Star className="w-4 h-4" />}
          />
          <HUDFrame className="p-4 md:p-6 mt-4">
            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              {/* Rating */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60 mb-2">
                  Rate the track (1–10)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                    const active = rating != null && n <= rating;
                    return (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        className={cn(
                          "w-9 h-9 md:w-10 md:h-10 grid place-items-center border text-sm font-anton transition-all",
                          active ? "text-black" : "text-bone/70 hover:text-bone"
                        )}
                        style={{
                          borderColor: active ? GOLD : `${GOLD}33`,
                          background: active ? GOLD : "transparent",
                          boxShadow: active ? `0 0 12px ${GOLD}66` : undefined,
                        }}
                        aria-label={`Rate ${n}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hot or Not */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60 mb-2">
                  Hot or Not
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setVote("hot")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 border font-anton uppercase tracking-wide transition-all",
                      vote === "hot" ? "text-black" : "text-bone/80"
                    )}
                    style={{
                      borderColor: vote === "hot" ? "#ff5a1f" : `${GOLD}33`,
                      background: vote === "hot" ? "#ff5a1f" : "transparent",
                      boxShadow: vote === "hot" ? "0 0 18px #ff5a1f88" : undefined,
                    }}
                  >
                    <Flame className="w-4 h-4" />
                    Hot
                  </button>
                  <button
                    type="button"
                    onClick={() => setVote("not")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 border font-anton uppercase tracking-wide transition-all",
                      vote === "not" ? "text-black" : "text-bone/80"
                    )}
                    style={{
                      borderColor: vote === "not" ? "#bbb" : `${GOLD}33`,
                      background: vote === "not" ? "#ddd" : "transparent",
                    }}
                  >
                    <X className="w-4 h-4" />
                    Not
                  </button>
                </div>
              </div>

              {/* Name + Opinion */}
              <div className="grid sm:grid-cols-[180px_1fr] gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  maxLength={40}
                  className="bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${GOLD}33` }}
                />
                <input
                  type="text"
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value)}
                  placeholder="Drop your opinion on the track"
                  maxLength={240}
                  className="bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${GOLD}33` }}
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 font-anton uppercase tracking-wide text-black transition-all"
                style={{
                  background: `linear-gradient(135deg, ${GOLD_GLOW}, ${GOLD})`,
                  boxShadow: `0 0 24px ${GOLD}55`,
                }}
              >
                <Send className="w-4 h-4" />
                Submit Verdict
              </button>
            </form>
          </HUDFrame>
        </section>

        {/* LIVE FEED */}
        <section className="mb-8 md:mb-12">
          <SectionHeader
            eyebrow="In The Room"
            title="Live Audience Feed"
            icon={<Radio className="w-4 h-4" />}
          />
          <HUDFrame className="p-3 md:p-4 mt-4">
            <div className="max-h-[420px] overflow-y-auto pr-1 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {comments.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 border bg-bone/[0.02]"
                    style={{ borderColor: `${GOLD}22` }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-anton text-black shrink-0"
                          style={{ background: GOLD }}
                        >
                          {c.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="font-anton uppercase tracking-wide text-sm text-bone truncate">
                          {c.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.rating != null && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 border"
                            style={{ borderColor: `${GOLD}66`, color: GOLD }}
                          >
                            {c.rating}/10
                          </span>
                        )}
                        {c.vote === "hot" && (
                          <span className="text-[10px] px-1.5 py-0.5 border border-orange-500/60 text-orange-400 flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Hot
                          </span>
                        )}
                        {c.vote === "not" && (
                          <span className="text-[10px] px-1.5 py-0.5 border border-bone/30 text-bone/60 flex items-center gap-1">
                            <X className="w-3 h-3" /> Not
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-bone/80 pl-9">{c.text}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </HUDFrame>
        </section>

        {/* PAYWALL — PICK A TIER */}
        <section className="mb-8 md:mb-12">
          <SectionHeader
            eyebrow="Unlock Submission"
            title="Choose Your Spotlight Tier"
            icon={<Lock className="w-4 h-4" />}
          />
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {LIVE_TIER_LIST.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                selected={selectedTier === tier.id}
                onSelect={() => {
                  setSelectedTier(tier.id);
                  resetCheckout();
                  // Scroll the form into view on mobile
                  setTimeout(() => {
                    document
                      .getElementById("submission-form")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 50);
                }}
              />
            ))}
          </div>
        </section>

        {/* SUBMIT MUSIC (gated by tier selection) */}
        <section className="mb-6" id="submission-form">
          <SectionHeader
            eyebrow={selectedTier ? "Step 2" : "Locked"}
            title="Submit Music For Live Review"
            icon={selectedTier ? <Send className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          />
          <HUDFrame className="p-4 md:p-6 mt-4 relative">
            {!selectedTier && (
              <div
                className="absolute inset-0 z-20 grid place-items-center backdrop-blur-md"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                <div className="text-center px-6">
                  <div
                    className="mx-auto mb-3 w-12 h-12 grid place-items-center rounded-full"
                    style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}66` }}
                  >
                    <Lock className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div className="font-anton text-xl uppercase text-bone">Locked</div>
                  <p className="text-bone/70 text-sm mt-1 max-w-xs">
                    Pick a tier above to unlock the submission form.
                  </p>
                </div>
              </div>
            )}

            {clientSecret ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60">
                    Paying for{" "}
                    <span style={{ color: GOLD }}>
                      {selectedTier ? LIVE_TIERS[selectedTier].name : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={resetCheckout}
                    className="text-[11px] uppercase tracking-[0.2em] text-bone/70 hover:text-bone underline-offset-4 hover:underline"
                  >
                    Change details
                  </button>
                </div>
                <div className="rounded bg-white">
                  <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitMusic}
                className={cn(
                  "grid sm:grid-cols-2 gap-3",
                  !selectedTier && "pointer-events-none select-none opacity-60",
                )}
              >
                <input
                  type="text"
                  required
                  value={subArtist}
                  onChange={(e) => setSubArtist(e.target.value)}
                  placeholder="Artist name *"
                  maxLength={80}
                  className="bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${GOLD}33` }}
                />
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Contact email *"
                  maxLength={120}
                  className="bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${GOLD}33` }}
                />
                <input
                  type="url"
                  required
                  value={subLink}
                  onChange={(e) => setSubLink(e.target.value)}
                  placeholder="Song link (YouTube, SoundCloud, etc.) *"
                  maxLength={300}
                  className="sm:col-span-2 bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${GOLD}33` }}
                />
                <textarea
                  value={subMsg}
                  onChange={(e) => setSubMsg(e.target.value)}
                  placeholder="Short message (song title, release info, etc.)"
                  maxLength={500}
                  rows={4}
                  className="sm:col-span-2 bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none resize-none"
                  style={{ borderColor: `${GOLD}33` }}
                />
                {checkoutError && (
                  <div className="sm:col-span-2 text-sm text-red-400 border border-red-500/40 bg-red-500/10 px-3 py-2">
                    {checkoutError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting || !selectedTier}
                  className="sm:col-span-2 flex items-center justify-center gap-2 py-3 font-anton uppercase tracking-wide text-black transition-all disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_GLOW}, ${GOLD})`,
                    boxShadow: `0 0 24px ${GOLD}55`,
                  }}
                >
                  <Lock className="w-4 h-4" />
                  {submitting
                    ? "Loading checkout…"
                    : selectedTier
                      ? `Pay $${(LIVE_TIERS[selectedTier].amountCents / 100).toFixed(0)} & Submit`
                      : "Pick a tier above"}
                </button>
              </form>
            )}
          </HUDFrame>
        </section>
      </div>
    </FutureShell>
  );
}

function SectionHeader({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: GOLD }}
      >
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-1 font-anton text-2xl md:text-3xl uppercase tracking-wide text-bone">
        {title}
      </h2>
    </div>
  );
}

function SocialPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-bone/70 border"
      style={{ borderColor: `${GOLD}33` }}
    >
      {icon}
      {label}
    </span>
  );
}

function TierCard({
  tier,
  selected,
  onSelect,
}: {
  tier: LiveTier;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative text-left p-5 border transition-all flex flex-col h-full",
        selected ? "scale-[1.01]" : "hover:scale-[1.01]",
      )}
      style={{
        borderColor: selected ? GOLD : `${GOLD}33`,
        background: selected
          ? `linear-gradient(180deg, ${GOLD}1a, transparent 70%)`
          : "rgba(0,0,0,0.35)",
        boxShadow: selected ? `0 0 28px ${GOLD}44` : undefined,
      }}
    >
      {tier.badge && (
        <span
          className="absolute -top-2 right-3 text-[9px] uppercase tracking-[0.25em] px-2 py-0.5 text-black font-anton"
          style={{ background: GOLD }}
        >
          {tier.badge}
        </span>
      )}
      <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60">
        {tier.shortId === "premium" ? "Top Tier" : tier.shortId === "featured" ? "Spotlight" : "Standard"}
      </div>
      <div className="font-anton text-2xl uppercase tracking-wide text-bone mt-1">
        {tier.name}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-anton text-4xl" style={{ color: GOLD }}>
          ${(tier.amountCents / 100).toFixed(0)}
        </span>
        <span className="text-bone/50 text-xs">one-time</span>
      </div>
      <p className="text-bone/70 text-sm mt-2">{tier.tagline}</p>
      <ul className="mt-4 space-y-2 flex-1">
        {tier.perks.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-bone/80">
            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div
        className="mt-5 py-2.5 text-center text-xs font-anton uppercase tracking-[0.25em] border transition-colors"
        style={{
          borderColor: selected ? GOLD : `${GOLD}55`,
          color: selected ? "#000" : GOLD,
          background: selected ? GOLD : "transparent",
        }}
      >
        {selected ? "Selected" : "Unlock with Stripe"}
      </div>
    </button>
  );
}