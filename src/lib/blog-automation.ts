/**
 * Pure, browser-safe helpers for the Daily Blog Automation.
 * Server code imports these for scheduling gates, QA checks and cost estimates.
 */

export const BLOG_PILLARS = ["evergreen", "promotion", "tutorial", "spotlight", "news"] as const;
export type BlogPillar = (typeof BLOG_PILLARS)[number];

export const PILLAR_LABELS: Record<BlogPillar, string> = {
  evergreen: "Evergreen education",
  promotion: "Artist promotion guide",
  tutorial: "Tunevio feature tutorial",
  spotlight: "Artist spotlight (verified only)",
  news: "Industry news (needs sources)",
};

/** Real Tunevio pages that generated articles may link to. */
export const INTERNAL_LINKS: { path: string; label: string }[] = [
  { path: "/discover", label: "Discover independent artists" },
  { path: "/live", label: "Live broadcasts" },
  { path: "/play", label: "Battle Arena" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/artists", label: "Artist directory" },
  { path: "/videos", label: "Music videos" },
  { path: "/events", label: "Events" },
  { path: "/pricing", label: "Pricing" },
  { path: "/signup", label: "Sign up" },
  { path: "/studio", label: "Studio" },
  { path: "/blog", label: "Blog" },
  { path: "/blog/how-to-live-stream-music", label: "How to live stream music" },
  { path: "/blog/how-artists-get-paid-for-streaming-music", label: "How artists get paid for streaming" },
  { path: "/blog/can-you-play-music-on-live-stream", label: "Can you play music on a live stream" },
  { path: "/blog/live-stream-music-twitch-youtube-facebook", label: "Live stream music on Twitch, YouTube and Facebook" },
];

export const MODEL_ID = "openai/gpt-6-astra";
// Credits per token for the model above (tier under 272k tokens).
const INPUT_COST = 0.00004;
const OUTPUT_COST = 0.0002;

export function estimateCredits(inputTokens: number, outputTokens: number) {
  return Math.round((inputTokens * INPUT_COST + outputTokens * OUTPUT_COST) * 10000) / 10000;
}

/** Local date (YYYY-MM-DD) and hour in a time zone, DST-aware via Intl. */
export function zonedParts(now: Date, timeZone = "America/Chicago") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

export type GateSettings = { enabled: boolean; paused_reason: string | null; publish_hour: number; timezone: string };

/** Decide whether the hourly scheduler tick should run today's job. */
export function scheduleGate(s: GateSettings, now: Date): { run: boolean; date: string; reason?: string } {
  const { date, hour } = zonedParts(now, s.timezone);
  if (!s.enabled) return { run: false, date, reason: "disabled" };
  if (s.paused_reason) return { run: false, date, reason: "paused" };
  if (hour !== s.publish_hour) return { run: false, date, reason: "not_publish_hour" };
  return { run: true, date };
}

/** HTTP statuses that may be retried on a later tick. */
export function classifyError(status: number | undefined): "retry" | "pause" | "fail" {
  if (status === 429 || (status !== undefined && status >= 500)) return "retry";
  if (status === 402 || status === 403) return "pause";
  return "fail";
}

export function normalizeTopic(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((w) => w.length > 2).sort().join(" ");
}

function shingles(text: string, n = 5) {
  const w = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

/** Jaccard similarity of 5-word shingles (0..1). */
export function similarity(a: string, b: string) {
  const A = shingles(a), B = shingles(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}

export async function contentHash(text: string) {
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Article = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  category: string;
  keywords: string[];
  tags: string[];
  body: string; // markdown with ## / ### headings
  sources: { url: string; title: string }[];
};

export type QaIssue = { check: string; message: string };

const SPAM = /\b(guaranteed?|#1 ranking|first page of google|act now|100% free|get rich|viral overnight|click here)\b/i;

export function wordCount(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Deterministic QA checks. AI review findings are merged in by the server. */
export function structuralQa(
  a: Article,
  ctx: { pillar: BlogPillar; existing: { slug: string; title: string; body: string }[]; verifiedSourceUrls?: string[] },
): QaIssue[] {
  const issues: QaIssue[] = [];
  const words = wordCount(a.body);
  if (words < 450) issues.push({ check: "completeness", message: `Only ${words} words` });
  if (words > 1600) issues.push({ check: "completeness", message: `Too long (${words} words)` });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug) || a.slug.length > 80) issues.push({ check: "metadata", message: "Invalid slug" });
  if (a.metaTitle.length < 20 || a.metaTitle.length > 65) issues.push({ check: "metadata", message: "Meta title must be 20–65 characters" });
  if (a.metaDescription.length < 70 || a.metaDescription.length > 160) issues.push({ check: "metadata", message: "Meta description must be 70–160 characters" });
  const h2 = (a.body.match(/^## /gm) ?? []).length;
  if (h2 < 2) issues.push({ check: "structure", message: "Needs at least two H2 sections" });
  if (/^# /m.test(a.body)) issues.push({ check: "structure", message: "Body must not contain its own H1" });

  const links = [...a.body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
  const allowed = new Set(INTERNAL_LINKS.map((l) => l.path));
  for (const l of links) if (!allowed.has(l)) issues.push({ check: "links", message: `Unknown internal link ${l}` });
  if (links.length > 5) issues.push({ check: "links", message: "Too many internal links" });
  const external = [...a.body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  const sourceSet = new Set(a.sources.map((s) => s.url));
  for (const e of external) if (!sourceSet.has(e)) issues.push({ check: "links", message: `External link not in sources: ${e}` });

  const spamHits = (a.body.match(new RegExp(SPAM.source, "gi")) ?? []).length;
  if (spamHits > 0) issues.push({ check: "spam", message: "Contains promotional or guarantee language" });
  const tunevioMentions = (a.body.match(/tunevio/gi) ?? []).length;
  if (ctx.pillar !== "tutorial" && tunevioMentions > 6) issues.push({ check: "spam", message: "Excessive self-promotion" });

  for (const e of ctx.existing) {
    if (e.slug === a.slug) issues.push({ check: "duplicate", message: "Slug already used" });
    if (normalizeTopic(e.title) === normalizeTopic(a.title)) issues.push({ check: "duplicate", message: `Same title as "${e.title}"` });
    if (similarity(e.body, a.body) > 0.2) issues.push({ check: "duplicate", message: `Substantially similar to "${e.title}"` });
  }

  if (ctx.pillar === "news") {
    const verified = new Set(ctx.verifiedSourceUrls ?? []);
    const ok = a.sources.filter((s) => verified.has(s.url));
    if (ok.length < 2) issues.push({ check: "sources", message: "News needs at least two verified sources" });
  }
  return issues;
}

export function readMinutes(body: string) {
  return Math.max(1, Math.round(wordCount(body) / 220));
}
