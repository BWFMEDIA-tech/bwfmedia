import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'BWF Media'
const GOLD = '#D4A24C'

interface StudioBookingProps {
  name?: string
  sessionType?: string
  date?: string
  time?: string
  duration?: string
  crewSize?: string
}

const StudioBookingConfirmation = ({
  name,
  sessionType,
  date,
  time,
  duration,
  crewSize,
}: StudioBookingProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} studio session request has been received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>
            <span style={{ color: '#000' }}>BWF MEDIA </span>
            <span style={{ color: GOLD }}>TV</span>
          </Text>
          <Text style={tagline}>Studio Booking · Request Received</Text>
        </Section>

        <Heading style={h1}>
          {name ? `Thanks, ${name}.` : 'Thanks for booking.'}
        </Heading>

        <Text style={text}>
          We've received your studio session request. Below are the details
          you submitted — our team will review and reach back out shortly to
          confirm and arrange the deposit.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>Session Type</Text>
          <Text style={detailValue}>{sessionType || '—'}</Text>

          <Hr style={hrLine} />

          <Text style={detailLabel}>Date & Time</Text>
          <Text style={detailValue}>
            {date || '—'} @ {time || '—'}
          </Text>

          <Hr style={hrLine} />

          <Text style={detailLabel}>Duration</Text>
          <Text style={detailValue}>{duration || '—'}</Text>

          <Hr style={hrLine} />

          <Text style={detailLabel}>Crew Size</Text>
          <Text style={detailValue}>{crewSize || '—'}</Text>
        </Section>

        <Heading style={h2}>Next Steps</Heading>
        <Text style={text}>
          <strong style={{ color: GOLD }}>1. Confirmation —</strong> A BWF team
          member will email you within 24 hours to confirm the slot or propose
          alternatives if needed.
        </Text>
        <Text style={text}>
          <strong style={{ color: GOLD }}>2. Deposit —</strong> A deposit is
          required to lock in your session. Payment instructions and the
          deposit amount will be included in your confirmation email.
        </Text>
        <Text style={text}>
          <strong style={{ color: GOLD }}>3. Studio Location —</strong> The
          full studio address will be shared once the deposit is received.
        </Text>

        <Hr style={hrLine} />

        <Text style={footerText}>
          Questions? Reach out at{' '}
          <a href="mailto:bookbwfmedia@gmail.com" style={link}>
            bookbwfmedia@gmail.com
          </a>{' '}
          or call (470) 333-6136.
        </Text>
        <Text style={footerSmall}>
          Visuals That Move Culture · {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StudioBookingConfirmation,
  subject: 'Your BWF Studio session request — confirmation incoming',
  displayName: 'Studio Booking Confirmation',
  previewData: {
    name: 'Jordan',
    sessionType: 'Artist Interview',
    date: 'Jun 10, 2026',
    time: '2:00 PM',
    duration: '2 Hours',
    crewSize: 'Duo (2 Operators)',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: 0,
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = {
  borderLeft: `3px solid ${GOLD}`,
  paddingLeft: '14px',
  marginBottom: '32px',
}
const brandText = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.05em',
  margin: '0',
}
const tagline = {
  fontSize: '10px',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  color: '#888',
  margin: '4px 0 0',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  margin: '0 0 16px',
}
const h2 = {
  fontSize: '15px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  margin: '32px 0 12px',
}
const text = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#3a3a3a',
  margin: '0 0 14px',
}
const detailsBox = {
  border: `1px solid ${GOLD}55`,
  background: '#fbf7ef',
  padding: '20px 22px',
  margin: '24px 0',
}
const detailLabel = {
  fontSize: '10px',
  letterSpacing: '0.25em',
  textTransform: 'uppercase' as const,
  color: '#888',
  margin: '0 0 4px',
}
const detailValue = {
  fontSize: '15px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  margin: '0 0 12px',
}
const hrLine = {
  border: 'none',
  borderTop: `1px solid ${GOLD}33`,
  margin: '12px 0',
}
const link = { color: GOLD, textDecoration: 'underline' }
const footerText = {
  fontSize: '13px',
  color: '#555',
  margin: '24px 0 6px',
}
const footerSmall = {
  fontSize: '11px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  color: '#999',
  margin: '0',
}