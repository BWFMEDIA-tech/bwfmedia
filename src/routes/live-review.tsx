import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  X,
  Star,
  Send,
  Lock,
  Check,
  Play,
  Music,
} from "lucide-react";
import { FutureShell } from "@/components/site/FutureShell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createLiveSubmissionCheckout } from "@/lib/live-submission-checkout.functions";
import { LIVE_TIER_LIST, LIVE_TIERS, type LiveTierId, type LiveTier } from "@/lib/live-review-tiers";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Link } from "@tanstack/react-router";
import { useLiveQueue, type LiveQueueRow } from "@/lib/useLiveQueue";
import { ModeToggle, PodcastStudio, type LiveMode } from "@/components/PodcastMode";
import { useAuth } from "@/lib/auth-context";

const RED = "#ef2b2b";
const RED_DEEP = "#c01616";

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
  { id: "c1", name: "RealOne88", text: "This track is fire! 🔥🔥", at: Date.now() - 60_000 },
  { id: "c2", name: "MusicLover", text: "The flow is crazy on this!", at: Date.now() - 120_000 },
  { id: "c3", name: "BWF_Fan", text: "8.5 from me 💯", at: Date.now() - 180_000 },
  { id: "c4", name: "IndieArtist", text: "Keep pushing fam! 🙌", at: Date.now() - 240_000 },
  { id: "c5", name: "NextUp203", text: "HOT all day! 🔥", at: Date.now() - 300_000 },
];

const STATUS_LABEL: Record<string, string> = {
  live: "Now Reviewing Live",
  next_up: "Up Next",
  queued: "In Queue",
  done: "Reviewed",
};

function LiveReviewPage() {
  // Mode: existing live review vs. additive podcast overlay.
  const [mode, setMode] = useState<LiveMode>("review");

  // Review panel state
  const [rating, setRating] = useState<number | null>(null);
  const [vote, setVote] = useState<"hot" | "not" | null>(null);
  const [opinion, setOpinion] = useState("");
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS);
  const [chatInput, setChatInput] = useState("");

  // Submission form state
  const [submitting, setSubmitting] = useState(false);
  const [subArtist, setSubArtist] = useState("");
  const [subSongTitle, setSubSongTitle] = useState("");
  const [subPhoto, setSubPhoto] = useState("");
  const [subLink, setSubLink] = useState("");
  const [subMsg, setSubMsg] = useState("");
  const [selectedTier, setSelectedTier] = useState<LiveTierId | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const auth = useAuth();
  const subEmail = auth.user?.email ?? "";

  // Real-time queue
  const { rows: queue } = useLiveQueue();
  const nowLive = queue.find((r) => r.queue_status === "live") ?? null;
  const nextUp = queue.filter((r) => r.queue_status === "next_up").slice(0, 3);
  const upcoming = queue.filter((r) => r.queue_status === "queued").slice(0, 8);
  const spotlight = queue
    .filter((r) => r.tier !== "basic" && r.queue_status !== "done")
    .slice(0, 4);

  function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!opinion.trim() && rating == null && !vote) {
      toast.error("Drop a rating, vote, or opinion first.");
      return;
    }
    const c: Comment = {
      id: crypto.randomUUID(),
      name: "You",
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

  function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setComments((prev) => [
      { id: crypto.randomUUID(), name: "You", text: chatInput.trim(), at: Date.now() },
      ...prev,
    ]);
    setChatInput("");
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
          songTitle: subSongTitle.trim(),
          photoUrl: subPhoto.trim(),
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

  function scrollToTiers() {
    document.getElementById("pricing-tiers")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <FutureShell>
      <PaymentTestModeBanner />
      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12">
        {/* MODE SWITCH — Live Review (existing) / Live Podcast (overlay) */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <ModeToggle mode={mode} onChange={setMode} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-bone/50">
            {mode === "podcast" ? "Broadcasting podcast" : "Broadcasting live reviews"}
          </span>
        </div>

        {/* HERO — left copy, right live video */}
        <section className="grid lg:grid-cols-2 gap-6 lg:gap-10 mb-10 lg:mb-14 items-center">
          <div>
            <h1 className="font-anton text-4xl sm:text-5xl lg:text-6xl xl:text-7xl uppercase tracking-tight text-bone leading-[0.95]">
              Live Reviews.
              <br />
              Real Feedback.
              <br />
              <span style={{ color: RED }}>Real Exposure.</span>
            </h1>
            <p className="mt-5 text-bone/70 text-sm md:text-base max-w-md">
              Independent artists. Raw music.
              <br />
              Real reactions from a live audience.
            </p>
            <div className="mt-6 flex items-center gap-4 flex-wrap">
              <a
                href="#live-room"
                className="inline-flex items-center gap-2 px-6 py-3 font-anton uppercase tracking-[0.15em] text-bone text-sm transition-all hover:brightness-110"
                style={{
                  background: RED,
                  boxShadow: `0 0 28px ${RED}55`,
                }}
              >
                Watch Live Now <Play className="w-4 h-4 fill-current" />
              </a>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-bone/70">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: RED }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: RED }} />
                </span>
                {mode === "podcast" ? "Live on Podcast" : "Live on YouTube"}
              </div>
            </div>
          </div>
          <div
            className="relative w-full aspect-video overflow-hidden bg-black"
            style={{ border: `1px solid ${RED}55`, boxShadow: `0 0 40px ${RED}33` }}
          >
            <span
              className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] font-anton text-bone"
              style={{ background: RED }}
            >
              {mode === "podcast" ? "● On Air" : "● Live"}
            </span>
            <iframe
              src={YT_LIVE_EMBED}
              title="BWFMEDIA Live Review Room"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs text-bone/90 flex items-center gap-2"
              style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.85))" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: RED }} />
              <span className="font-anton uppercase tracking-wider">
                {mode === "podcast" ? "On Air:" : "Live Now:"}
              </span>
              <span>
                {mode === "podcast"
                  ? "Live podcast session with featured guests."
                  : "Reviewing new music and giving real feedback!"}
              </span>
            </div>
          </div>
        </section>

        {/* PODCAST MODE OVERLAY — additive, does not change review flow */}
        {mode === "podcast" && <PodcastStudio queue={queue} />}

        {/* LIVE LINEUP — auto-updating broadcast board */}
        <section className="mb-10 lg:mb-14 space-y-6">
          <div className="flex items-center justify-between">
            <RailHeader
              title="Live Lineup"
              accent={<Star className="w-4 h-4 fill-current" style={{ color: RED }} />}
            />
            <span className="text-[10px] uppercase tracking-[0.25em] text-bone/50">
              Auto-updates in real time
            </span>
          </div>

          {/* NOW LIVE banner */}
          {nowLive ? (
            <NowLiveBanner artist={nowLive} />
          ) : (
            <div
              className="border bg-black/40 p-5 text-center text-bone/60 text-sm"
              style={{ borderColor: `${RED}22` }}
            >
              No artist is being reviewed right now. Check back when the stream goes live.
            </div>
          )}

          {/* NEXT UP */}
          {nextUp.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="block w-0.5 h-4" style={{ background: RED }} />
                <h3 className="font-anton uppercase tracking-wide text-bone text-sm">
                  Next Up
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {nextUp.map((a) => (
                  <QueueArtistCard key={a.id} artist={a} highlight />
                ))}
              </div>
            </div>
          )}

          {/* SPOTLIGHT */}
          {spotlight.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="block w-0.5 h-4" style={{ background: RED }} />
                  <h3 className="font-anton uppercase tracking-wide text-bone text-sm">
                    Featured Spotlight
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {spotlight.map((a) => (
                  <QueueArtistCard key={a.id} artist={a} />
                ))}
              </div>
            </div>
          )}

          {/* QUEUE LIST */}
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="block w-0.5 h-4" style={{ background: RED }} />
                <h3 className="font-anton uppercase tracking-wide text-bone text-sm">
                  In Queue ({upcoming.length})
                </h3>
              </div>
              <ol
                className="border bg-black/40 divide-y"
                style={{ borderColor: `${RED}22` }}
              >
                {upcoming.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3 p-3">
                    <span
                      className="w-7 h-7 grid place-items-center font-anton text-xs"
                      style={{ color: RED, border: `1px solid ${RED}55` }}
                    >
                      {i + 1}
                    </span>
                    <Link
                      to="/artist/$id"
                      params={{ id: a.id }}
                      className="flex-1 min-w-0 flex items-center gap-3 hover:underline-offset-4 hover:underline"
                    >
                      <span className="font-anton uppercase tracking-wide text-bone text-sm truncate">
                        {a.artist_name}
                      </span>
                      {a.song_title && (
                        <span className="text-bone/50 text-xs truncate">"{a.song_title}"</span>
                      )}
                    </Link>
                    <TierTag tier={a.tier} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {/* LIVE REVIEW ROOM + LIVE CHAT */}
        <section id="live-room" className="mb-10 lg:mb-14 grid lg:grid-cols-[1.6fr_1fr] gap-4 lg:gap-6">
          {/* Review room */}
          <div className="border bg-black/40 p-4 md:p-5" style={{ borderColor: `${RED}33` }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="block w-0.5 h-5" style={{ background: RED }} />
              <h2 className="font-anton text-xl uppercase tracking-wide text-bone">Live Review Room</h2>
              <span className="w-2 h-2 rounded-full ml-1" style={{ background: RED }} />
            </div>

            {/* Now reviewing track */}
            <div className="flex gap-3 mb-5">
              <div
                className="shrink-0 w-16 h-16 grid place-items-center"
                style={{ background: `radial-gradient(circle, ${RED}55, transparent 70%)`, border: `1px solid ${RED}55` }}
              >
                <Play className="w-6 h-6" style={{ color: RED }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: RED }}>
                  Now Reviewing
                </div>
                <div className="font-anton text-lg uppercase tracking-wide text-bone leading-tight mt-0.5">
                  Jay Mula
                </div>
                <div className="text-bone/60 text-xs">"No Rules"</div>
                <FakeWaveform />
              </div>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              {/* Star rating */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60 mb-2">
                    Rate This Track <span className="text-bone/40">(1-10)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                      const active = rating != null && n <= rating;
                      return (
                        <button
                          type="button"
                          key={n}
                          onClick={() => setRating(n)}
                          aria-label={`Rate ${n}`}
                          className="p-0.5"
                        >
                          <Star
                            className={cn("w-5 h-5 transition-colors", active ? "fill-current" : "")}
                            style={{ color: active ? RED : "rgba(255,255,255,0.25)" }}
                          />
                        </button>
                      );
                    })}
                    <span
                      className="ml-2 px-2 py-1 text-xs font-anton border"
                      style={{ borderColor: `${RED}55`, color: RED }}
                    >
                      {rating ?? "—"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60 mb-2">
                    Hot Or Not?
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVote("hot")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 font-anton uppercase tracking-wide text-sm transition-all",
                        vote === "hot" ? "text-bone" : "text-bone/80 border",
                      )}
                      style={{
                        background: vote === "hot" ? RED : "transparent",
                        borderColor: vote === "hot" ? RED : "rgba(255,255,255,0.15)",
                        boxShadow: vote === "hot" ? `0 0 18px ${RED}66` : undefined,
                      }}
                    >
                      <Flame className="w-4 h-4" />
                      Hot
                    </button>
                    <button
                      type="button"
                      onClick={() => setVote("not")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 font-anton uppercase tracking-wide text-sm border transition-all",
                      )}
                      style={{
                        borderColor: vote === "not" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                        background: vote === "not" ? "rgba(255,255,255,0.08)" : "transparent",
                        color: "var(--bone, #f6efe3)",
                      }}
                    >
                      <X className="w-4 h-4" />
                      Not
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60 mb-2">
                  Drop Your Opinion
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    placeholder="Type your feedback here..."
                    maxLength={240}
                    className="flex-1 bg-black/60 border px-3 py-2.5 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                    style={{ borderColor: "rgba(255,255,255,0.12)" }}
                  />
                  <button
                    type="submit"
                    className="px-5 font-anton uppercase tracking-wide text-bone text-sm transition-all hover:brightness-110"
                    style={{ background: RED, boxShadow: `0 0 16px ${RED}55` }}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Live Chat */}
          <div className="border bg-black/40 flex flex-col" style={{ borderColor: `${RED}33` }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `${RED}22` }}>
              <div className="flex items-center gap-2">
                <span className="block w-0.5 h-5" style={{ background: RED }} />
                <h2 className="font-anton text-xl uppercase tracking-wide text-bone">Live Chat</h2>
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-bone/60">◉ 1.2K</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[280px] max-h-[420px]">
              <AnimatePresence initial={false}>
                {comments.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2.5"
                  >
                    <div
                      className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-anton text-bone shrink-0"
                      style={{ background: `${RED}55`, border: `1px solid ${RED}` }}
                    >
                      {c.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-anton uppercase tracking-wide text-xs text-bone truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-bone/40 shrink-0">just now</span>
                      </div>
                      <p className="text-xs text-bone/80 leading-snug">{c.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <form onSubmit={handleChatSend} className="p-3 border-t flex gap-2" style={{ borderColor: `${RED}22` }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something..."
                maxLength={200}
                className="flex-1 bg-black/60 border px-3 py-2 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              />
              <button
                type="submit"
                className="px-3 grid place-items-center text-bone transition-colors hover:brightness-110"
                style={{ background: RED }}
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>

        {/* HOW IT WORKS + PRICING */}
        <section id="pricing-tiers" className="mb-10 lg:mb-14 grid lg:grid-cols-[1fr_2fr] gap-4 lg:gap-6">
          <div className="border bg-black/40 p-5 md:p-6" style={{ borderColor: `${RED}33` }}>
            <h2 className="font-anton text-xl uppercase tracking-wide text-bone mb-5">How It Works</h2>
            <ol className="grid grid-cols-3 lg:grid-cols-1 gap-5">
              {[
                { n: 1, title: "Submit", desc: "Choose a plan and submit your music." },
                { n: 2, title: "Get Reviewed", desc: "Your track gets played live on the show." },
                { n: 3, title: "Get Exposed", desc: "Reach new fans and grow your audience." },
              ].map((s) => (
                <li key={s.n} className="text-center lg:text-left lg:flex lg:items-start lg:gap-3">
                  <div
                    className="mx-auto lg:mx-0 w-12 h-12 grid place-items-center shrink-0"
                    style={{ border: `1px solid ${RED}66`, background: `${RED}11` }}
                  >
                    <span className="font-anton text-lg" style={{ color: RED }}>{s.n}</span>
                  </div>
                  <div className="mt-2 lg:mt-0">
                    <div className="font-anton uppercase tracking-wide text-bone text-sm">{s.n}. {s.title}</div>
                    <p className="text-bone/60 text-xs mt-1">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 md:gap-4">
            {LIVE_TIER_LIST.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                selected={selectedTier === tier.id}
                onSelect={() => {
                  setSelectedTier(tier.id);
                  resetCheckout();
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
          <div className="flex items-center gap-2 mb-4">
            <span className="block w-0.5 h-5" style={{ background: RED }} />
            <h2 className="font-anton text-xl uppercase tracking-wide text-bone">
              Submit Music For Live Review
            </h2>
            {!selectedTier && <Lock className="w-4 h-4 text-bone/50" />}
          </div>
          <div
            className="border bg-black/40 p-4 md:p-6 relative"
            style={{ borderColor: `${RED}33` }}
          >
            {!selectedTier && (
              <div
                className="absolute inset-0 z-20 grid place-items-center backdrop-blur-md"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                <div className="text-center px-6">
                  <div
                    className="mx-auto mb-3 w-12 h-12 grid place-items-center rounded-full"
                    style={{ background: `${RED}22`, border: `1px solid ${RED}66` }}
                  >
                    <Lock className="w-5 h-5" style={{ color: RED }} />
                  </div>
                  <div className="font-anton text-xl uppercase text-bone">Locked</div>
                  <p className="text-bone/70 text-sm mt-1 max-w-xs">
                    Pick a plan above to unlock the submission form.
                  </p>
                  <button
                    type="button"
                    onClick={scrollToTiers}
                    className="mt-4 px-5 py-2 font-anton uppercase tracking-[0.2em] text-xs text-bone"
                    style={{ background: RED, boxShadow: `0 0 18px ${RED}55` }}
                  >
                    Choose A Plan
                  </button>
                </div>
              </div>
            )}

            {clientSecret ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60">
                    Paying for{" "}
                    <span style={{ color: RED }}>
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
                  style={{ borderColor: `${RED}33` }}
                />
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Contact email *"
                  maxLength={120}
                  className="bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${RED}33` }}
                />
                <input
                  type="text"
                  value={subSongTitle}
                  onChange={(e) => setSubSongTitle(e.target.value)}
                  placeholder="Song title"
                  maxLength={120}
                  className="bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${RED}33` }}
                />
                <input
                  type="url"
                  value={subPhoto}
                  onChange={(e) => setSubPhoto(e.target.value)}
                  placeholder="Profile photo URL (optional)"
                  maxLength={400}
                  className="bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${RED}33` }}
                />
                <input
                  type="url"
                  required
                  value={subLink}
                  onChange={(e) => setSubLink(e.target.value)}
                  placeholder="Song link (YouTube, SoundCloud, etc.) *"
                  maxLength={300}
                  className="sm:col-span-2 bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none"
                  style={{ borderColor: `${RED}33` }}
                />
                <textarea
                  value={subMsg}
                  onChange={(e) => setSubMsg(e.target.value)}
                  placeholder="Short message (song title, release info, etc.)"
                  maxLength={500}
                  rows={4}
                  className="sm:col-span-2 bg-black/40 border px-3 py-3 text-sm text-bone placeholder:text-bone/40 focus:outline-none resize-none"
                  style={{ borderColor: `${RED}33` }}
                />
                {checkoutError && (
                  <div className="sm:col-span-2 text-sm text-red-400 border border-red-500/40 bg-red-500/10 px-3 py-2">
                    {checkoutError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting || !selectedTier}
                  className="sm:col-span-2 flex items-center justify-center gap-2 py-3 font-anton uppercase tracking-wide text-bone transition-all disabled:opacity-60 hover:brightness-110"
                  style={{
                    background: `linear-gradient(135deg, ${RED}, ${RED_DEEP})`,
                    boxShadow: `0 0 24px ${RED}55`,
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
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section
          className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 px-5 py-5 md:px-8 md:py-6"
          style={{ background: `linear-gradient(90deg, ${RED_DEEP}, ${RED})` }}
        >
          <div className="flex items-center gap-4">
            <span className="font-anton text-2xl uppercase tracking-tight text-bone leading-none">
              BWF<span className="block text-xs tracking-[0.3em] mt-1">Media</span>
            </span>
            <p className="font-anton uppercase tracking-wide text-bone text-base md:text-xl leading-tight">
              We don't just play music.
              <br className="hidden md:block" />
              <span className="md:hidden"> </span>We build careers.
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToTiers}
            className="px-6 py-3 font-anton uppercase tracking-[0.2em] text-sm text-bone border-2 border-bone hover:bg-bone hover:text-black transition-colors"
          >
            Join The Movement
          </button>
        </section>
      </div>
    </FutureShell>
  );
}

function RailHeader({ title, accent }: { title: string; accent?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="block w-0.5 h-5" style={{ background: RED }} />
      <h2 className="font-anton text-xl uppercase tracking-wide text-bone flex items-center gap-2">
        {title}
        {accent}
      </h2>
    </div>
  );
}

function FakeWaveform() {
  // Static-looking SVG waveform, animated subtly
  const bars = Array.from({ length: 60 }, (_, i) => {
    const h = 6 + Math.abs(Math.sin(i * 0.7) * 18) + Math.abs(Math.sin(i * 0.25) * 6);
    return h;
  });
  return (
    <div className="mt-2 flex items-end gap-[2px] h-7" aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[3px] block"
          style={{
            height: `${h}px`,
            background: i < bars.length * 0.6 ? RED : `${RED}55`,
          }}
        />
      ))}
      <span className="ml-2 text-[10px] text-bone/50 self-center font-mono">04:35 / 06:12</span>
    </div>
  );
}

function tierBadge(tier: LiveQueueRow["tier"]) {
  if (tier === "premium") return { label: "Premium", bg: RED, color: "#fff" };
  if (tier === "featured") return { label: "Featured", bg: "#f5a623", color: "#1a0606" };
  return { label: "Basic", bg: "rgba(255,255,255,0.15)", color: "#fff" };
}

function TierTag({ tier }: { tier: LiveQueueRow["tier"] }) {
  const b = tierBadge(tier);
  return (
    <span
      className="px-2 py-1 text-[9px] uppercase tracking-[0.2em] font-anton shrink-0"
      style={{ background: b.bg, color: b.color }}
    >
      {b.label}
    </span>
  );
}

function QueueArtistCard({
  artist,
  highlight = false,
}: {
  artist: LiveQueueRow;
  highlight?: boolean;
}) {
  const b = tierBadge(artist.tier);
  const status = STATUS_LABEL[artist.queue_status] ?? "";
  return (
    <Link
      to="/artist/$id"
      params={{ id: artist.id }}
      className="relative group overflow-hidden border bg-black/40 transition-all hover:scale-[1.01]"
      style={{
        borderColor: highlight ? RED : `${RED}22`,
        boxShadow: highlight ? `0 0 18px ${RED}33` : undefined,
      }}
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        style={{ background: `radial-gradient(circle at 50% 30%, ${RED}33, #000 70%)` }}
      >
        {artist.photo_url ? (
          <img
            src={artist.photo_url}
            alt={artist.artist_name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-bone/20 font-anton text-5xl">
            {artist.artist_name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
        )}
        <span
          className="absolute top-2 left-2 px-2 py-1 text-[9px] uppercase tracking-[0.2em] font-anton"
          style={{ background: b.bg, color: b.color }}
        >
          {b.label}
        </span>
        {artist.uploaded_audio_url && (
          <span
            className="absolute top-2 right-2 grid place-items-center w-6 h-6"
            style={{ background: RED, color: "#fff" }}
            title="Track uploaded"
          >
            <Music className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-anton uppercase tracking-wide text-bone text-sm truncate">
          {artist.artist_name}
        </div>
        <div className="text-bone/60 text-xs truncate">
          {artist.song_title ? `"${artist.song_title}"` : artist.song_link}
        </div>
        <div
          className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]"
          style={{ color: RED }}
        >
          <Play className="w-3 h-3 fill-current" />
          {status}
        </div>
      </div>
    </Link>
  );
}

function NowLiveBanner({ artist }: { artist: LiveQueueRow }) {
  return (
    <Link
      to="/artist/$id"
      params={{ id: artist.id }}
      className="block border bg-black/60 overflow-hidden group"
      style={{
        borderColor: RED,
        boxShadow: `0 0 36px ${RED}44`,
      }}
    >
      <div className="grid md:grid-cols-[180px_1fr] gap-4 p-4 md:p-5 items-center">
        <div
          className="relative w-full aspect-square md:aspect-[4/5] overflow-hidden"
          style={{ background: `radial-gradient(circle, ${RED}55, #000 70%)` }}
        >
          {artist.photo_url ? (
            <img
              src={artist.photo_url}
              alt={artist.artist_name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-bone/20 font-anton text-4xl">
              {artist.artist_name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </div>
          )}
        </div>
        <div>
          <div
            className="inline-flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-bone mb-2"
            style={{ background: RED }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Now Reviewing Live
          </div>
          <h3 className="font-anton text-3xl md:text-4xl uppercase tracking-tight text-bone leading-none">
            {artist.artist_name}
          </h3>
          {artist.song_title && (
            <p className="text-bone/70 mt-1 text-sm">"{artist.song_title}"</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <TierTag tier={artist.tier} />
            <span className="text-[10px] uppercase tracking-[0.25em] text-bone/60 group-hover:text-bone">
              View artist profile →
            </span>
          </div>
        </div>
      </div>
    </Link>
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
  const isFeatured = tier.shortId === "featured";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative text-left p-5 border transition-all flex flex-col h-full bg-black/40",
        selected ? "scale-[1.01]" : "hover:scale-[1.01]",
      )}
      style={{
        borderColor: selected || isFeatured ? RED : "rgba(255,255,255,0.1)",
        boxShadow: selected ? `0 0 28px ${RED}55` : isFeatured ? `0 0 20px ${RED}33` : undefined,
      }}
    >
      {isFeatured && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.25em] px-3 py-1 text-bone font-anton whitespace-nowrap"
          style={{ background: RED }}
        >
          Most Popular
        </span>
      )}
      <div className="text-center">
        {tier.shortId === "premium" && (
          <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60 mb-1">Top Tier</div>
        )}
        <div className="font-anton text-lg uppercase tracking-wide text-bone">
          {tier.name}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1 justify-center">
        <span className="font-anton text-4xl text-bone">
          ${(tier.amountCents / 100).toFixed(0)}
        </span>
      </div>
      <div className="text-bone/50 text-xs text-center">one-time</div>
      {isFeatured && (
        <p className="text-bone/80 text-xs mt-3 text-center">
          Priority placement +<br />Artist Spotlight listing.
        </p>
      )}
      <ul className="mt-4 space-y-2 flex-1 text-left">
        {tier.perks.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-bone/80">
            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: RED }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div
        className="mt-5 py-2.5 text-center text-[11px] font-anton uppercase tracking-[0.25em] transition-colors"
        style={{
          background: selected ? RED : isFeatured ? RED : "rgba(255,255,255,0.08)",
          color: "#fff",
        }}
      >
        {selected ? "Selected" : "Unlock With Stripe"}
      </div>
    </button>
  );
}