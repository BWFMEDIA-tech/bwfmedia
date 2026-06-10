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
  senderName?: string
  preview?: string
  inboxUrl?: string
}

const Email = ({
  senderName = 'Someone',
  preview = 'You have a new message on BWF Network',
  inboxUrl = 'https://bwfmedia.company/messages',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${senderName} sent you a message`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={badge}>● NEW MESSAGE</Text>
        </Section>
        <Heading style={h1}>{senderName} sent you a message</Heading>
        <Text style={body}>{preview}</Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={inboxUrl} style={cta}>
            Open inbox
          </Button>
        </Section>
        <Text style={footer}>
          You're receiving this because someone messaged you on BWF Network while you were offline.
          Manage your notifications in account settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d?.senderName ?? 'Someone'} sent you a message on BWF Network`,
  displayName: 'New direct message',
  previewData: {
    senderName: 'JXHNNY RICH',
    preview: 'Hey — loved your last set. Want to collab?',
    inboxUrl: 'https://bwfmedia.company/messages',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0a0a12' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const header = { marginBottom: '12px' }
const badge = {
  display: 'inline-block',
  background: '#8b5cf6',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.18em',
  padding: '6px 10px',
  borderRadius: '4px',
  margin: 0,
}
const h1 = { fontSize: '24px', fontWeight: 800, margin: '8px 0 16px', color: '#0a0a12' }
const body = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#1f2937',
  background: '#f8fafc',
  borderLeft: '3px solid #8b5cf6',
  padding: '14px 16px',
  borderRadius: '6px',
}
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