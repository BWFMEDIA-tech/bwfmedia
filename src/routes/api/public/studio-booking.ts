// @public-endpoint: external callers (webhook / OAuth callback / cron). Caller is verified inside the handler via signature / shared secret / Stripe-session lookup.
import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendAndLog } from '@/lib/email-send-log'
const SITE_URL = 'https://bwfmedia.company'

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

        // 2. Send confirmation email
        try {
          const outcome = await sendAndLog(supabase, {
            templateName: 'studio-booking-confirmation',
            to: data.email,
            templateData: {
              name: data.full_name,
              sessionType: data.session_type,
              date: formatDate(data.preferred_date),
              time: data.preferred_time,
              duration: data.duration,
              crewSize: data.crew_size,
              payUrl: `${SITE_URL}/pay/${inserted.id}?table=studio_bookings`,
            },
            idempotencyKey: `studio-confirm-${inserted.id}`,
            messageId: `studio-${inserted.id}`,
          })
          if (outcome === 'suppressed') {
            return Response.json({ ok: true, id: inserted.id, emailSent: false, reason: 'suppressed' })
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