import { getEmailUnsubscribe, setEmailUnsubscribe } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

// Compatibility for links in emails sent before Lovable-managed unsubscribe links.
// New emails use Lovable's hosted unsubscribe page instead.
const domain = 'notify.www.bwfnetwork.com'
const headers = { 'Cache-Control': 'no-store' }
const validToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

async function lookup(token: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('email, used_at')
    .eq('token', token)
    .maybeSingle()
  if (error) throw error
  return data
}

export const Route = createFileRoute('/email/unsubscribe')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('token')
        if (!validToken(token)) return Response.json({ valid: false }, { status: 400, headers })
        try {
          const record = await lookup(token)
          if (!record) return Response.json({ valid: false }, { status: 404, headers })
          if (record.used_at) return Response.json({ valid: false, reason: 'already_unsubscribed' }, { headers })
          const apiKey = process.env['LOVABLE_API_KEY']
          if (!apiKey) throw new Error('Email API is not configured')
          const status = await getEmailUnsubscribe({ recipient: record.email, domain }, { apiKey })
          return Response.json(status.subscribed ? { valid: true } : { valid: false, reason: 'already_unsubscribed' }, { headers })
        } catch (error) {
          console.error('Legacy unsubscribe lookup failed', error)
          return Response.json({ error: 'Unable to verify link' }, { status: 503, headers })
        }
      },
      POST: async ({ request }) => {
        let token: unknown = new URL(request.url).searchParams.get('token')
        const contentType = request.headers.get('content-type') ?? ''
        try {
          if (contentType.includes('application/json')) {
            const body: unknown = await request.json()
            if (body && typeof body === 'object' && 'token' in body) token = body.token
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const body = new URLSearchParams(await request.text())
            if (body.has('token')) token = body.get('token')
          }
        } catch {
          return Response.json({ success: false }, { status: 400, headers })
        }
        if (!validToken(token)) return Response.json({ success: false }, { status: 400, headers })
        try {
          const record = await lookup(token)
          if (!record) return Response.json({ success: false }, { status: 404, headers })
          if (record.used_at) return Response.json({ success: false, reason: 'already_unsubscribed' }, { headers })

          const apiKey = process.env['LOVABLE_API_KEY']
          if (!apiKey) throw new Error('Email API is not configured')
          // Suppress first. If the provider is unavailable, leave the token usable for retry.
          await setEmailUnsubscribe({ recipient: record.email, domain, subscribed: false }, { apiKey })
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          const { error } = await supabaseAdmin
            .from('email_unsubscribe_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', token)
            .is('used_at', null)
          if (error) console.error('Legacy unsubscribe token update failed', { code: error.code })
          return Response.json({ success: true }, { headers })
        } catch (error) {
          console.error('Legacy unsubscribe failed', error)
          return Response.json({ error: 'Unable to unsubscribe' }, { status: 503, headers })
        }
      },
    },
  },
})