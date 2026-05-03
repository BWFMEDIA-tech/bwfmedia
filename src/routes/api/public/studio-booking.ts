import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SENDER_DOMAIN = 'notify.bwfmedia.company'
const FROM_ADDRESS = `BWF Media <bookings@${SENDER_DOMAIN}>`

const Schema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  session_type: z.string().min(1).max(80),
  crew_size: z.string().min(1).max(80),
  duration: z.string().min(1).max(40),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferred_time: z.string().min(1).max(40),
  notes: z.string().max(2000).optional().nullable(),
})

export const Route = createFileRoute('/api/public/studio-booking')({
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
          return Response.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
        }
        const data = parsed.data
        const supabase = createClient(supabaseUrl, serviceKey)

        // 1. Insert booking
        const { data: inserted, error: insertError } = await supabase
          .from('studio_bookings')
          .insert({
            full_name: data.full_name,
            email: data.email,
            phone: data.phone ?? null,
            session_type: data.session_type,
            crew_size: data.crew_size,
            duration: data.duration,
            preferred_date: data.preferred_date,
            preferred_time: data.preferred_time,
            notes: data.notes ?? null,
          })
          .select('id')
          .single()

        if (insertError || !inserted) {
          console.error('Booking insert failed', insertError)
          return Response.json({ error: 'Failed to save booking' }, { status: 500 })
        }

        // 2. Render confirmation email and enqueue
        try {
          const entry = TEMPLATES['studio-booking-confirmation']
          const templateData = {
            name: data.full_name,
            sessionType: data.session_type,
            date: formatDate(data.preferred_date),
            time: data.preferred_time,
            duration: data.duration,
            crewSize: data.crew_size,
          }
          const html = await render(React.createElement(entry.component, templateData))
          const text = await render(React.createElement(entry.component, templateData), { plainText: true })
          const subject = typeof entry.subject === 'function' ? entry.subject(templateData) : entry.subject

          const messageId = `studio-${inserted.id}`

          // Create / get unsubscribe token (one per email)
          const normalizedEmail = data.email.toLowerCase()
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

          // Check suppression
          const { data: suppressed } = await supabase
            .from('suppressed_emails')
            .select('email')
            .eq('email', normalizedEmail)
            .maybeSingle()

          if (suppressed) {
            console.log('Skipping email send — recipient suppressed', { email: normalizedEmail })
            return Response.json({ ok: true, id: inserted.id, emailSent: false, reason: 'suppressed' })
          }

          const payload = {
            to: data.email,
            from: FROM_ADDRESS,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: 'studio-booking-confirmation',
            idempotency_key: `studio-confirm-${inserted.id}`,
            unsubscribe_token: unsubscribeToken,
            message_id: messageId,
            queued_at: new Date().toISOString(),
          }

          const { error: enqueueError } = await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload,
          })

          if (enqueueError) {
            console.error('Failed to enqueue email', enqueueError)
          } else {
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'studio-booking-confirmation',
              recipient_email: data.email,
              status: 'pending',
            })
          }
        } catch (err) {
          console.error('Email pipeline error', err)
          // Don't fail the booking if email pipeline errors
        }

        return Response.json({ ok: true, id: inserted.id })
      },
    },
  },
})

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}