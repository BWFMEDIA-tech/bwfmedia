import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

const SendInput = z.object({
  recipientId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
})

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export const sendDirectMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context

    if (data.recipientId === userId) {
      throw new Error('Cannot message yourself')
    }

    // Insert via the user's RLS-scoped client so policies are enforced
    const { data: inserted, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: userId,
        recipient_id: data.recipientId,
        body: data.body,
      })
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .single()

    if (error || !inserted) {
      throw new Error(error?.message || 'Failed to send message')
    }

    // Fire-and-forget offline email notification (don't block the response).
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

      const [{ data: recipientProfile }, { data: recipientPresence }] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('id, display_name')
          .eq('id', data.recipientId)
          .maybeSingle(),
        supabaseAdmin
          .from('user_presence')
          .select('last_seen_at')
          .eq('user_id', data.recipientId)
          .maybeSingle(),
      ])
      void recipientProfile

      const now = Date.now()
      const lastSeen = recipientPresence?.last_seen_at
        ? new Date(recipientPresence.last_seen_at).getTime()
        : 0
      const isOffline = !lastSeen || now - lastSeen > OFFLINE_THRESHOLD_MS

      if (isOffline) {
        // Look up sender display name and recipient email
        const [{ data: senderProfile }, { data: recipientAuth }] = await Promise.all([
          supabaseAdmin
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .maybeSingle(),
          supabaseAdmin.auth.admin.getUserById(data.recipientId),
        ])

        const recipientEmail = recipientAuth?.user?.email
        if (recipientEmail) {
          // Check suppression
          const { data: suppressed } = await supabaseAdmin
            .from('suppressed_emails')
            .select('id')
            .eq('email', recipientEmail.toLowerCase())
            .maybeSingle()

          if (!suppressed) {
            const senderName =
              senderProfile?.display_name || 'Someone on BWF Network'
            const preview =
              data.body.length > 200 ? data.body.slice(0, 197) + '…' : data.body

            // Render & enqueue directly (avoids admin-only send route)
            const React = await import('react')
            const { render } = await import('@react-email/components')
            const { TEMPLATES } = await import('@/lib/email-templates/registry')
            const template = TEMPLATES['direct-message']
            if (template) {
              const templateData = {
                senderName,
                preview,
                inboxUrl: 'https://bwfmedia.company/messages',
              }
              const element = React.createElement(template.component, templateData)
              const html = await render(element)
              const text = await render(element, { plainText: true })
              const subject =
                typeof template.subject === 'function'
                  ? template.subject(templateData)
                  : template.subject
              const messageId = crypto.randomUUID()
              await supabaseAdmin.from('email_send_log').insert({
                message_id: messageId,
                template_name: 'direct-message',
                recipient_email: recipientEmail,
                status: 'pending',
              })
              await supabaseAdmin.rpc('enqueue_email', {
                queue_name: 'transactional_emails',
                payload: {
                  message_id: messageId,
                  to: recipientEmail,
                  from: `bwfmedia <noreply@notify.bwfmedia.company>`,
                  sender_domain: 'notify.bwfmedia.company',
                  subject,
                  html,
                  text,
                  purpose: 'transactional',
                  label: 'direct-message',
                  idempotency_key: `dm-${inserted.id}`,
                  queued_at: new Date().toISOString(),
                },
              })
            }
          }
        }
      }
    } catch (e) {
      console.error('[direct-message] offline email failed', e)
    }

    return { message: inserted }
  })

const MarkReadInput = z.object({
  otherUserId: z.string().uuid(),
})

export const markConversationRead = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MarkReadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { error } = await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('sender_id', data.otherUserId)
      .is('read_at', null)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const touchPresence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    await supabase
      .from('user_presence')
      .upsert(
        { user_id: userId, online: true, last_seen_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    return { ok: true }
  })