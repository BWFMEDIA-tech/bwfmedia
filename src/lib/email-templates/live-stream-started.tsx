import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  hostName?: string
  streamTitle?: string
  streamUrl?: string
}

const Email = ({
  hostName = 'A BWF host',
  streamTitle = 'BWF Live',
  streamUrl = 'https://bwfmedia.company/live',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${hostName} just went live on BWF Network`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={liveBadge}>● LIVE NOW</Text>
        </Section>
        <Heading style={h1}>{hostName} is live</Heading>
        <Text style={subtitle}>{streamTitle}</Text>
        <Text style={body}>
          Join the conversation now — drop in to listen, react, or request the stage.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={streamUrl} style={cta}>
            Join the live stream
          </Button>
        </Section>
        <Text style={footer}>
          You're receiving this because you opted in to live alerts on BWF Network. Manage notification
          preferences in your account settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `🔴 Live Now: ${d?.hostName ?? 'A BWF host'} just started a live stream`,
  displayName: 'Live stream started',
  previewData: {
    hostName: 'JXHNNY RICH',
    streamTitle: 'BWF Live: Unsigned Artist Review',
    streamUrl: 'https://bwfmedia.company/live',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0a0a12' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const header = { marginBottom: '12px' }
const liveBadge = {
  display: 'inline-block',
  background: '#ef4444',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.18em',
  padding: '6px 10px',
  borderRadius: '4px',
  margin: 0,
}
const h1 = { fontSize: '28px', fontWeight: 800, margin: '8px 0 4px', color: '#0a0a12' }
const subtitle = { fontSize: '15px', color: '#475569', margin: '0 0 16px' }
const body = { fontSize: '15px', lineHeight: '1.6', color: '#1f2937' }
const cta = {
  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '14px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#94a3b8', marginTop: '24px', lineHeight: '1.5' }