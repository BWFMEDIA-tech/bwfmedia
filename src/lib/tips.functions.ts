import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';
import { validateReturnUrl } from '@/lib/validate-return-url';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Schema = z.object({
  streamId: z.string().uuid(),
  amountCents: z.number().int().min(100).max(50000),
  message: z.string().max(200).optional(),
  displayName: z.string().max(80).optional(),
  returnUrl: z.string().url().refine((u) => {
    try { validateReturnUrl(u); return true; } catch { return false; }
  }, { message: 'returnUrl must be on the application domain' }),
  environment: z.enum(['sandbox', 'live']) as z.ZodType<StripeEnv>,
});

type Result = { clientSecret: string } | { error: string };

export const createTipCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Schema.parse(data))
  .handler(async ({ data, context }): Promise<Result> => {
    try {
      const stripe = createStripeClient(data.environment);
      // Always derive the tipping user from the verified session — never
      // trust a client-supplied user id.
      const tipUserId = context.userId ?? '';
      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'BWF Live Tip' },
            unit_amount: data.amountCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        ui_mode: 'embedded_page',
        return_url: data.returnUrl,
        payment_intent_data: { description: 'BWF Live Tip' },
        metadata: {
          kind: 'tip',
          streamId: data.streamId,
          tipUserId,
          tipDisplayName: data.displayName ?? '',
          tipMessage: data.message ?? '',
        },
      });
      return { clientSecret: session.client_secret ?? '' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stripe request failed';
      return { error: msg };
    }
  });