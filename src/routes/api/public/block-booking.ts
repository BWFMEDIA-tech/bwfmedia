// @public-endpoint: booking form. Caller must send a valid signed-in bearer token, verified inside the handler.
import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendAndLog } from '@/lib/email-send-log'
const SITE_URL = 'https://bwfnetwork.com'

const Schema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  shoot_type: z.string().min(1).max(80),
  location: z.string().min(1).max(200),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferred_time: z.string().min(1).max(40),
  notes: z.string().max(2000).optional().nullable(),
})

export const Route = createFileRoute('/api/public/block-booking')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server config error' }, { status: 500 })
        }

        const authHeader = request.headers.get('authorization') ?? ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
        if (!token) {
          return Response.json({ error: 'Please sign in to book' }, { status: 401 })
        }
        const authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
        const { data: userData, error: userErr } = await authClient.auth.getUser(token)
        if (userErr || !userData?.user) {
          return Response.json({ error: 'Please sign in to book' }, { status: 401 })
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

        const { data: inserted, error: insertError } = await supabase
          .from('block_bookings')
          .insert({
            user_id: userData.user.id,
            full_name: data.full_name,
            email: data.email,
            phone: data.phone ?? null,
            shoot_type: data.shoot_type,
            location: data.location,
            preferred_date: data.preferred_date,
            preferred_time: data.preferred_time,
            notes: data.notes ?? null,
          })
          .select('id')
          .single()

        if (insertError || !inserted) {
          console.error('Block booking insert failed', insertError)
          return Response.json({ error: 'Failed to save booking' }, { status: 500 })
        }

        try {
          const outcome = await sendAndLog(supabase, {
            templateName: 'block-booking-confirmation',
            to: data.email,
            templateData: {
              name: data.full_name,
              shootType: data.shoot_type,
              location: data.location,
              date: formatDate(data.preferred_date),
              time: data.preferred_time,
              payUrl: `${SITE_URL}/pay/${inserted.id}?table=block_bookings`,
            },
            idempotencyKey: `block-confirm-${inserted.id}`,
            messageId: `block-${inserted.id}`,
          })
          if (outcome === 'suppressed') {
            return Response.json({ ok: true, id: inserted.id, emailSent: false, reason: 'suppressed' })
          }
        } catch (err) {
          console.error('Email pipeline error', err)
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