import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { validateReturnUrl } from '@/lib/validate-return-url'

const SENDER_DOMAIN = 'notify.bwfmedia.company'
const FROM_ADDRESS = `BWF Media <checkout@${SENDER_DOMAIN}>`

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
          const entry = TEMPLATES['checkout-cancellation']
          const templateData = {
            // Recipient-facing template fields are intentionally not accepted
            // from the public client; only the generic body is sent.
            returnUrl: data.returnUrl,
          }
          const html = await render(React.createElement(entry.component, templateData))
          const text = await render(React.createElement(entry.component, templateData), { plainText: true })
          const subject = typeof entry.subject === 'function' ? entry.subject(templateData) : entry.subject

          // Idempotency: same recipient + same cart contents = single email.
          const messageId = `checkout-cancel-${data.cartFingerprint}-${data.email.toLowerCase()}`

          // Skip if we've already enqueued this exact cancel email.
          const { data: prior } = await supabase
            .from('email_send_log')
            .select('message_id')
            .eq('message_id', messageId)
            .maybeSingle()
          if (prior) {
            return Response.json({ ok: true, sent: false, reason: 'duplicate' })
          }

          const normalizedEmail = data.email.toLowerCase()

          // Suppression check
          const { data: suppressed } = await supabase
            .from('suppressed_emails')
            .select('email')
            .eq('email', normalizedEmail)
            .maybeSingle()
          if (suppressed) {
            return Response.json({ ok: true, sent: false, reason: 'suppressed' })
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

          // Unsubscribe token (one per email)
          let unsubscribeToken: string | null = null
          const { data: existingTok } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', normalizedEmail)
            .maybeSingle()
          if (existingTok?.token) {
            unsubscribeToken = existingTok.token
          } else {
            const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
            const { error: tokErr } = await supabase
              .from('email_unsubscribe_tokens')
              .insert({ email: normalizedEmail, token: newToken })
            if (!tokErr) unsubscribeToken = newToken
          }

          const payload = {
            to: data.email,
            from: FROM_ADDRESS,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: 'checkout-cancellation',
            idempotency_key: messageId,
            unsubscribe_token: unsubscribeToken,
            message_id: messageId,
            queued_at: new Date().toISOString(),
          }

          const { error: enqueueError } = await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload,
          })

          if (enqueueError) {
            console.error('Failed to enqueue cancellation email', enqueueError)
            return Response.json({ ok: false, error: 'enqueue_failed' }, { status: 500 })
          }

          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'checkout-cancellation',
            recipient_email: data.email,
            status: 'pending',
            metadata: { ip },
          })

          return Response.json({ ok: true, sent: true })
        } catch (err) {
          console.error('Cancellation email error', err)
          return Response.json({ ok: false, error: 'internal' }, { status: 500 })
        }
      },
    },
  },
})
