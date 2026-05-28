import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'BWF Media'
const GOLD = '#D4A24C'

interface StreamInviteProps {
  hostName?: string
  streamTitle?: string
  inviteUrl?: string
}

const StreamInvite = ({ hostName, streamTitle, inviteUrl }: StreamInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{hostName || 'A BWF host'} invited you to join a live stream</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>
            <span style={{ color: '#000' }}>BWF MEDIA </span>
            <span style={{ color: GOLD }}>LIVE</span>
          </Text>
          <Text style={tagline}>Live Stream Invitation</Text>
        </Section>

        <Heading style={h1}>You're invited to go live</Heading>
        <Text style={text}>
          {hostName ? <><strong>{hostName}</strong> has</> : 'A BWF host has'} invited you to join the live stream
          {streamTitle ? <> <strong>"{streamTitle}"</strong></> : ''} on {SITE_NAME}.
        </Text>

        {inviteUrl && (
          <Section style={payBox}>
            <Text style={payLead}>Tap below to join when you're ready:</Text>
            <Button href={inviteUrl} style={payButton}>Join Stream</Button>
            <Text style={payFallback}>
              Or open this link: <a href={inviteUrl} style={link}>{inviteUrl}</a>
            </Text>
          </Section>
        )}

        <Hr style={hrLine} />
        <Text style={footerSmall}>Visuals That Move Culture · {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StreamInvite,
  subject: (data: Record<string, any>) =>
    data?.hostName
      ? `${data.hostName} invited you to a live stream on ${SITE_NAME}`
      : `You're invited to a live stream on ${SITE_NAME}`,
  displayName: 'Stream Invite',
  previewData: {
    hostName: 'BWF Host',
    streamTitle: 'Friday Night Sessions',
    inviteUrl: 'https://bwfmedia.company/stream/example',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0, padding: 0,
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { borderLeft: `3px solid ${GOLD}`, paddingLeft: '14px', marginBottom: '32px' }
const brandText = { fontSize: '28px', fontWeight: 'bold' as const, letterSpacing: '0.05em', margin: '0' }
const tagline = { fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: '#888', margin: '4px 0 0' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '14px', lineHeight: '1.6', color: '#3a3a3a', margin: '0 0 14px' }
const hrLine = { border: 'none', borderTop: `1px solid ${GOLD}33`, margin: '24px 0 12px' }
const link = { color: GOLD, textDecoration: 'underline' }
const payBox = { border: `1px solid ${GOLD}`, background: '#0a0a0a', padding: '20px 22px', margin: '8px 0 24px', textAlign: 'center' as const }
const payLead = { fontSize: '13px', color: '#f5f5f5', margin: '0 0 14px' }
const payButton = { background: GOLD, color: '#0a0a0a', fontSize: '14px', fontWeight: 'bold' as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, padding: '12px 24px', borderRadius: '2px', textDecoration: 'none', display: 'inline-block' }
const payFallback = { fontSize: '11px', color: '#bbb', margin: '14px 0 0', wordBreak: 'break-all' as const }
const footerSmall = { fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#999', margin: '0' }