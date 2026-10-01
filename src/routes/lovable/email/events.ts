import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}
const MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

// Notification-only record keeping. Lovable enforces suppression at send time.
async function record(reason: Reason, event: { event_id: string; data: { recipient: string; message_id?: string | null } }) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const email = event.data.recipient.toLowerCase()

  const { error: supErr } = await supabaseAdmin
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (supErr) {
    console.error('suppressed_emails write failed', { code: supErr.code, message: supErr.message, event_id: event.event_id })
    throw new Error('suppressed_emails write failed')
  }

  const { error: logErr } = await supabaseAdmin.from('email_send_log').insert({
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: email,
    status: STATUS[reason],
    error_message: MESSAGE[reason],
    metadata: null,
  })
  if (logErr) {
    console.error('email_send_log write failed', { code: logErr.code, message: logErr.message, event_id: event.event_id })
    throw new Error('email_send_log write failed')
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': (event) => record('bounce', event as any),
            'email.complaint': (event) => record('complaint', event as any),
            'email.unsubscribed': (event) => record('unsubscribe', event as any),
          },
        })
        return handler(request)
      },
    },
  },
})
