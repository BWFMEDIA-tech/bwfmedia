// Server-only investor deck content. Never import from client code; it is
// delivered by getDeckContent only after the deck password is verified.
// Inline markup: **text** = bold bone, [[text]] = blood color, \n = line break.

export const DECK_CONTENT = {
  cover: {
    eyebrow: "Investor Pitch Deck · 2026",
    tagline: "\"Real Content. Real People. Real Reach.\"",
    stats: [
      { big: "731.7M+", label: "Views" },
      { big: "335.625K+", label: "Subscribers" },
      { big: "811.9M+", label: "Likes" },
    ],
    founder: "Dantavious Lee",
  },
  problem: {
    kicker: "Independent creators are stuck",
    title: "Creators don't own\ntheir reach.",
    intro: "Independent artists and culture creators struggle with three core problems:",
    bullets: [
      "Distribution beyond social media",
      "Monetization control over their own content",
      "Exposure without signing to a label",
    ],
    quote: "Platforms like YouTube prioritize **algorithms**, not **ownership**.",
  },
  solution: {
    kicker: "A vertically integrated network",
    title: "Content + Distribution\n+ Monetization.",
    cards: [
      { t: "Viral Media Platform", d: "Short-form, music, culture, virality." },
      { t: "Interview + Promo Engine", d: "Direct artist exposure & promotion." },
      { t: "BWFMEDIA TV", d: "Streaming network for culture content." },
    ],
    quote: "Think: an **independent Netflix + Tubi** for culture-driven content.",
  },
  traction: {
    kicker: "Demand is already validated",
    title: "The audience\nis already here.",
    stats: [
      { big: "731.7M", label: "Total Views" },
      { big: "335,625", label: "Subscribers" },
      { big: "18.8M", label: "Likes" },
      { big: "2.8M", label: "Views (Last 7 Days)" },
      { big: "811.9K+", label: "Comments" },
      { big: "3.1M", label: "Shares" },
    ],
    note: "These aren't projections, this is a **live, engaged audience** we already command across YouTube, Instagram, TikTok and short-form networks.",
  },
  ecosystem: {
    kicker: "One brand, many surfaces",
    title: "The full BWFMEDIA\nplatform.",
    items: [
      "YouTube + Social Channels",
      "Roku Streaming Channel",
      "Original Shows & Interviews",
      "Music Video Distribution",
      "Advertising & Marketing Services",
      "BWFMEDIA TV Network",
    ],
  },
  market: {
    kicker: "A massive, accelerating market",
    title: "$600B+ in motion.",
    stats: [
      { big: "$100B+", label: "Creator Economy" },
      { big: "$500B+", label: "Streaming Industry" },
    ],
    note: "Independent creators are **shifting away from labels** and toward direct monetization. BWFMEDIA sits at the intersection of both waves.",
  },
  business: {
    kicker: "Multiple revenue streams",
    title: "Six ways we\nmake money.",
    cards: [
      { t: "Paid Interviews", d: "$500+ per booking." },
      { t: "Artist Promo Packages", d: "Tiered $400 – $3,000." },
      { t: "Ad Revenue", d: "YouTube + streaming network." },
      { t: "Brand Partnerships", d: "Sponsorships & integrations." },
      { t: "Subscription Model", d: "Future recurring tier." },
      { t: "Content Licensing", d: "Resell archive & IP." },
    ],
  },
  competition: {
    kicker: "We compete across categories",
    title: "Nobody combines\nall three.",
    cards: [
      { t: "YouTube", d: "Distribution" },
      { t: "Netflix", d: "Content" },
      { t: "Tubi", d: "Free Streaming" },
    ],
    quote: "BWFMEDIA = **all three** + a [[culture niche]] + a proven **viral engine**.",
  },
  growth: {
    kicker: "How we scale from here",
    title: "The next 24 months.",
    bullets: [
      "Scale viral content production across all platforms",
      "Expand artist partnerships and exclusive interviews",
      "Launch the full BWFMEDIA TV streaming platform",
      "Paid ad amplification on top-performing content",
      "Influencer collaborations to expand reach",
    ],
  },
  financials: {
    kicker: "Revenue trajectory",
    title: "From $500K to\n$5M in 36 months.",
    years: [
      { y: "Year 1", v: "$250K – $500K" },
      { y: "Year 2", v: "$1M+" },
      { y: "Year 3", v: "$3M – $5M" },
    ],
    note: "Driven by scaling content output, expanding monetization systems, and converting our existing audience into paying customers and subscribers.",
  },
  ask: {
    kicker: "Investment opportunity",
    title: "Raising\n[[$500K – $1M.]]",
    uses: [
      "Content production & studio infrastructure",
      "Platform development (BWFMEDIA TV)",
      "Marketing & paid ad amplification",
      "Team expansion (editors, producers, sales)",
    ],
  },
  vision: {
    kicker: "Where we're going",
    quote: "\"Become the [[#1 independent digital network]] for culture-driven content.\"",
  },
  closing: {
    founder: "Dantavious Lee",
    email: "hello@bwfmedia.tv",
    stats: [
      { big: "731.7M+", label: "Views" },
      { big: "335.625K+", label: "Subs" },
      { big: "811.9M+", label: "Likes" },
    ],
  },
};

export type DeckContent = typeof DECK_CONTENT;
