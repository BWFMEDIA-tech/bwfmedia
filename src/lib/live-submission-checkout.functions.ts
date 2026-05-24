import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';
import { LIVE_TIERS, type LiveTierId } from '@/lib/live-review-tiers';
import { validateReturnUrl } from '@/lib/validate-return-url';

const TIER_IDS = ['live_review_basic', 'live_review_featured', 'live_review_premium'] as const;

const CreateSchema = z.object({
  tier: z.enum(TIER_IDS),
  artistName: z.string().min(1).max(120),
  email: z.string().email().max(180),
  songLink: z.string().url().max(500),
  message: z.string().max(1000).optional().default(''),
  returnUrl: z.string().url().refine((u) => {
    try { validateReturnUrl(u); return true; } catch { return false; }
  }, { message: 'returnUrl must be on the application domain' }),
  environment: z.enum(['sandbox', 'live']) as z.ZodType<StripeEnv>,
});

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export const createLiveSubmissionCheckout = createServerFn({ method: 'POST' })
  .inputValidator((data) => CreateSchema.parse(data))
  .handler(async ({ data }) => {
    const tier = LIVE_TIERS[data.tier as LiveTierId];
    if (!tier) throw new Error('Unknown tier');

    const supabase = admin();

    const { data: row, error: insertErr } = await supabase
      .from('live_submissions')
      .insert({
        artist_name: data.artistName,
        email: data.email,
        song_link: data.songLink,
        message: data.message || null,
        tier: tier.shortId,
        amount_cents: tier.amountCents,
        status: 'pending',
      })
      .select('id')
      .single();
    if (insertErr || !row) throw new Error(insertErr?.message ?? 'Failed to create submission');

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [tier.id], limit: 1 });
    if (!prices.data.length) throw new Error('Stripe price not configured for ' + tier.id);
    const price = prices.data[0];

    // Customer dedupe by email so repeat submitters land on same Customer.
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email: data.email, limit: 1 });
    if (existing.data.length) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email: data.email,
        name: data.artistName,
        metadata: { source: 'live_submission' },
      });
      customerId = created.id;
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: 'payment',
      ui_mode: 'embedded_page',
      return_url: data.returnUrl,
      customer: customerId,
      metadata: {
        submissionType: 'live_review',
        submissionId: row.id,
        tier: tier.shortId,
      },
      payment_intent_data: {
        description: `${tier.name} — ${data.artistName}`,
        metadata: {
          submissionType: 'live_review',
          submissionId: row.id,
          tier: tier.shortId,
        },
      },
    });

    await supabase
      .from('live_submissions')
      .update({ stripe_session_id: session.id })
      .eq('id', row.id);

    return { clientSecret: session.client_secret as string, submissionId: row.id };
  });

const StatusSchema = z.object({
  sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/),
});

export const getLiveSubmissionBySession = createServerFn({ method: 'GET' })
  .inputValidator((data) => StatusSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = admin();
    const { data: row } = await supabase
      .from('live_submissions')
      .select('id, artist_name, email, tier, status, amount_cents, paid_at')
      .eq('stripe_session_id', data.sessionId)
      .maybeSingle();
    return row ?? null;
  });