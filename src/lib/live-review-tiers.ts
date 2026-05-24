// Live Review paywall tiers. Keys MUST match Stripe price `lookup_key`s.

export type LiveTierId = 'live_review_basic' | 'live_review_featured' | 'live_review_premium';

export interface LiveTier {
  id: LiveTierId;
  shortId: 'basic' | 'featured' | 'premium';
  name: string;
  tagline: string;
  amountCents: number;
  perks: string[];
  badge?: string;
  highlight?: boolean;
}

export const LIVE_TIERS: Record<LiveTierId, LiveTier> = {
  live_review_basic: {
    id: 'live_review_basic',
    shortId: 'basic',
    name: 'Basic Submission',
    tagline: 'Get your record in the review queue.',
    amountCents: 5000,
    perks: [
      'Music submission unlocked',
      'Standard live review eligibility',
      'Added to upcoming review queue',
    ],
  },
  live_review_featured: {
    id: 'live_review_featured',
    shortId: 'featured',
    name: 'Featured Spotlight',
    tagline: 'Priority placement + Artist Spotlight listing.',
    amountCents: 15000,
    perks: [
      'Everything in Basic',
      'Priority review placement',
      'Artist Spotlight listing on the page',
      '"Featured Artist" badge',
    ],
    badge: 'Most Popular',
    highlight: true,
  },
  live_review_premium: {
    id: 'live_review_premium',
    shortId: 'premium',
    name: 'Premium Spotlight',
    tagline: 'Guaranteed live segment + top of queue.',
    amountCents: 30000,
    perks: [
      'Everything in Featured',
      'Guaranteed live review segment',
      '"Now Featured Live" status during stream',
      'Highest priority in queue',
    ],
  },
};

export const LIVE_TIER_LIST: LiveTier[] = [
  LIVE_TIERS.live_review_basic,
  LIVE_TIERS.live_review_featured,
  LIVE_TIERS.live_review_premium,
];

export function tierByShortId(short: string): LiveTier | undefined {
  return LIVE_TIER_LIST.find((t) => t.shortId === short);
}