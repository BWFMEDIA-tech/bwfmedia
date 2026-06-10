import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';
import { LIVE_TIERS, type LiveTierId } from '@/lib/live-review-tiers';
import { validateReturnUrl } from '@/lib/validate-return-url';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const TIER_IDS = ['live_review_basic', 'live_review_featured', 'live_review_premium'] as const;

const CreateSchema = z.object({
  tier: z.enum(TIER_IDS),
  artistName: z.string().min(1).max(120),
  songLink: z.string().url().max(500),
  songTitle: z.string().max(160).optional().default(''),
  photoUrl: z.string().url().max(500).optional().or(z.literal('')).default(''),
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
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const tier = LIVE_TIERS[data.tier as LiveTierId];
    if (!tier) throw new Error('Unknown tier');

    const supabase = admin();

    // Email is taken from the authenticated user, never trusted from input.
    const { data: userRes } = await context.supabase.auth.getUser();
    const userEmail = userRes.user?.email?.toLowerCase();
    if (!userEmail) throw new Error('Sign-in required to submit');

    const { data: row, error: insertErr } = await supabase
      .from('live_submissions')
      .insert({
        artist_name: data.artistName,
        email: userEmail,
        user_id: context.userId ?? null,
        song_link: data.songLink,
        song_title: data.songTitle || null,
        photo_url: data.photoUrl || null,
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
    const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (existing.data.length) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email: userEmail,
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
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => StatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = admin();
    const { data: row } = await supabase
      .from('live_submissions')
      .select('id, artist_name, email, tier, status, amount_cents, paid_at')
      .eq('stripe_session_id', data.sessionId)
      .maybeSingle();
    if (!row) return null;
    const { data: userRow } = await context.supabase.auth.getUser();
    const userEmail = userRow.user?.email?.toLowerCase() ?? null;
    const userId = userRow.user?.id ?? null;
    const { data: adminRow } = userId
      ? await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
      : { data: null };
    const isAdmin = !!adminRow;
    const owns = isAdmin || (userEmail && row.email && row.email.toLowerCase() === userEmail);
    if (!owns) {
      // Strip PII for non-owners.
      return {
        id: row.id,
        tier: row.tier,
        status: row.status,
        amount_cents: row.amount_cents,
        paid_at: row.paid_at,
      };
    }
    return row;
  });