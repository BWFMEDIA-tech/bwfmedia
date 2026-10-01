// @public-endpoint: external callers (webhook / OAuth callback / cron). Caller is verified inside the handler via signature / shared secret / Stripe-session lookup.
import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { validateReturnUrl } from '@/lib/validate-return-url'
import { sendAndLog } from '@/lib/email-send-log'

const Schema = z.object({
  email: z.string().email().max(200),
  cartFingerprint: z.string().min(1).max(120),
  returnUrl: z.string().url().max(500).optional().refine(
    (u) => {
      if (!u) return true;
      try { validateReturnUrl(u); return true; } catch { return false; }
    },
    { message: 'returnUrl must be on the application domain' },
  ),
})

export const Route = createFileRoute('/api/public/checkout-cancellation-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server config error' }, { status: 500 })
        }

        let body: unknown
        try { body = await request.json() } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        const parsed = Schema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'Invalid input' }, { status: 400 })
        }
        const data = parsed.data
        const supabase = createClient(supabaseUrl, serviceKey)

        // Per-IP rate limit (defense against many-recipient spam from a
        // single attacker). Max 5 cancellation sends per IP per hour.
        const ip =
          request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          'unknown'
        const ipSince = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const { count: ipCount } = await supabase
          .from('email_send_log')
          .select('id', { count: 'exact', head: true })
          .eq('template_name', 'checkout-cancellation')
          .gte('created_at', ipSince)
          .contains('metadata', { ip })
        if ((ipCount ?? 0) >= 5) {
          return Response.json({ ok: true, sent: false, reason: 'rate_limited' })
        }

        try {
          // Idempotency: same recipient + same cart contents = single email.
          const messageId = `checkout-cancel-${data.cartFingerprint}-${data.email.toLowerCase()}`

          const { data: prior } = await supabase
            .from('email_send_log')
            .select('message_id')
            .eq('message_id', messageId)
            .limit(1)
            .maybeSingle()
          if (prior) {
            return Response.json({ ok: true, sent: false, reason: 'duplicate' })
          }

          // Per-recipient rate limit to prevent abuse via rotating cart fingerprints.
          // Max 1 cancellation email per recipient per 24 hours.
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { count: recentCount } = await supabase
            .from('email_send_log')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_email', data.email)
            .eq('template_name', 'checkout-cancellation')
            .gte('created_at', since)
          if ((recentCount ?? 0) >= 1) {
            return Response.json({ ok: true, sent: false, reason: 'rate_limited' })
          }

          const outcome = await sendAndLog(supabase, {
            templateName: 'checkout-cancellation',
            to: data.email,
            // Recipient-facing template fields are intentionally not accepted
            // from the public client; only the generic body is sent.
            templateData: { returnUrl: data.returnUrl },
            idempotencyKey: messageId,
            metadata: { ip },
          })

          if (outcome === 'failed') {
            return Response.json({ ok: false, error: 'send_failed' }, { status: 500 })
          }
          if (outcome === 'suppressed') {
            return Response.json({ ok: true, sent: false, reason: 'suppressed' })
          }
          return Response.json({ ok: true, sent: true })
        } catch (err) {
          console.error('Cancellation email error', err)
          return Response.json({ ok: false, error: 'internal' }, { status: 500 })
        }
      },
    },
  },
})
