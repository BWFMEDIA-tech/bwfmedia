import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'BWF Media'
const GOLD = '#D4A24C'

interface BlockBookingProps {
  name?: string
  shootType?: string
  location?: string
  date?: string
  time?: string
  payUrl?: string
}

const BlockBookingConfirmation = ({
  name,
  shootType,
  location,
  date,
  time,
  payUrl,
}: BlockBookingProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} Off The Block pull-up request has been received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>
            <span style={{ color: '#000' }}>BWF MEDIA </span>
            <span style={{ color: GOLD }}>TV</span>
          </Text>
          <Text style={tagline}>Off The Block · Request Received</Text>
        </Section>

        <Heading style={h1}>
          {name ? `Thanks, ${name}.` : 'Thanks for booking.'}
        </Heading>

        <Text style={text}>
          We've received your Off The Block pull-up request. Below are the
          details you submitted — our team will review and reach back out
          shortly to confirm and lock the slot in.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>Shoot Type</Text>
          <Text style={detailValue}>{shootType || '—'}</Text>

          <Hr style={hrLine} />

          <Text style={detailLabel}>Location</Text>
          <Text style={detailValue}>{location || '—'}</Text>

          <Hr style={hrLine} />

          <Text style={detailLabel}>Date & Time</Text>
          <Text style={detailValue}>
            {date || '—'} @ {time || '—'}
          </Text>
        </Section>

        <Heading style={h2}>Next Steps</Heading>
        {payUrl && (
          <Section style={payBox}>
            <Text style={payLead}>
              Lock in your shoot now by completing payment:
            </Text>
            <Button href={payUrl} style={payButton}>
              Complete Payment
            </Button>
            <Text style={payFallback}>
              Or open this link: <a href={payUrl} style={link}>{payUrl}</a>
            </Text>
          </Section>
        )}
        <Text style={text}>
          <strong style={{ color: GOLD }}>1. Confirmation —</strong> A BWF crew
          member will email you within 24 hours to confirm the pull-up or
          propose alternatives if needed.
        </Text>
        <Text style={text}>
          <strong style={{ color: GOLD }}>2. Deposit —</strong> Use the payment
          link above to choose your package and pay. Your slot is locked in
          once payment is received.
        </Text>
        <Text style={text}>
          <strong style={{ color: GOLD }}>3. On Location —</strong> We'll
          coordinate exact arrival time and any logistics over email or text
          before shoot day.
        </Text>

        <Hr style={hrLine} />

        <Text style={footerText}>
          Questions? Reach out at{' '}
          <a href="mailto:bookbwfmedia@gmail.com" style={link}>
            bookbwfmedia@gmail.com
          </a>.
        </Text>
        <Text style={footerSmall}>
          The Streets · The People · The Real · {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BlockBookingConfirmation,
  subject: 'Your BWF Off The Block pull-up — confirmation incoming',
  displayName: 'Off The Block Booking Confirmation',
  previewData: {
    name: 'Jordan',
    shootType: 'Artist Interview',
    location: 'Brooklyn, NY',
    date: 'Jun 10, 2026',
    time: '2:00 PM',
    payUrl: 'https://bwfmedia.company/pay/example-id?table=block_bookings',
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
const payBox = {
  border: `1px solid ${GOLD}`,
  background: '#0a0a0a',
  padding: '20px 22px',
  margin: '8px 0 24px',
  textAlign: 'center' as const,
}
const payLead = {
  fontSize: '13px',
  color: '#f5f5f5',
  margin: '0 0 14px',
}
const payButton = {
  background: GOLD,
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  padding: '12px 24px',
  borderRadius: '2px',
  textDecoration: 'none',
  display: 'inline-block',
}
const payFallback = {
  fontSize: '11px',
  color: '#bbb',
  margin: '14px 0 0',
  wordBreak: 'break-all' as const,
}
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