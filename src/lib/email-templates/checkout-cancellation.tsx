import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'BWF Media'
const GOLD = '#D4A24C'
const BLOOD = '#A41E22'

interface CheckoutCancellationProps {
  name?: string
  itemCount?: number
  totalFormatted?: string
  returnUrl?: string
}

const CheckoutCancellation = ({
  name,
  itemCount,
  totalFormatted,
  returnUrl,
}: CheckoutCancellationProps) => {
  const url = returnUrl || 'https://bwfmedia.company'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {SITE_NAME} cart is saved — finish checkout when you're ready</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandText}>
              <span style={{ color: '#000' }}>BWF</span>
              <span style={{ color: GOLD }}>MEDIA</span>
            </Text>
            <Text style={tagline}>// Checkout // Paused</Text>
          </Section>

          <Heading style={h1}>
            {name ? `${name}, your cart is still here.` : 'Your cart is still here.'}
          </Heading>

          <Text style={text}>
            We noticed you stepped away from checkout — no payment was taken
            and nothing was charged to your card. Your selection is saved
            and ready when you are.
          </Text>

          {(itemCount || totalFormatted) && (
            <Section style={detailsBox}>
              {itemCount ? (
                <>
                  <Text style={detailLabel}>Items in cart</Text>
                  <Text style={detailValue}>{itemCount}</Text>
                </>
              ) : null}
              {totalFormatted ? (
                <>
                  <Hr style={hrLine} />
                  <Text style={detailLabel}>Cart total</Text>
                  <Text style={detailValue}>{totalFormatted}</Text>
                </>
              ) : null}
            </Section>
          )}

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={url} style={button}>
              Return to your cart
            </Button>
          </Section>

          <Heading style={h2}>How to retry checkout</Heading>
          <Text style={text}>
            1. Click the button above to come back to the site.<br />
            2. Open your cart from the top-right corner — your items are
            already there.<br />
            3. Hit <strong>Checkout</strong> and enter your card details to
            complete the booking.
          </Text>

          <Text style={text}>
            Ran into a payment issue? Try a different card or payment
            method. If anything's unclear, just reply to this email and
            we'll help you finish the booking.
          </Text>

          <Hr style={hrLine} />
          <Text style={footer}>
            — The {SITE_NAME} team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CheckoutCancellation,
  subject: 'Your BWF Media cart is saved — finish when you’re ready',
  displayName: 'Checkout cancellation',
  previewData: {
    name: 'Alex',
    itemCount: 2,
    totalFormatted: '$700',
    returnUrl: 'https://bwfmedia.company',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px', margin: '0 auto' }
const brandBar = { borderBottom: `2px solid ${GOLD}`, paddingBottom: '12px', marginBottom: '24px' }
const brandText = { fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.05em', margin: '0' }
const tagline = { fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '6px 0 0' }
const h1 = { fontSize: '26px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px', lineHeight: '1.2' }
const h2 = { fontSize: '15px', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '32px 0 12px' }
const text = { fontSize: '14px', color: '#3a3a3a', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f7f5f1', padding: '16px 20px', margin: '20px 0' }
const detailLabel = { fontSize: '10px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 4px' }
const detailValue = { fontSize: '15px', color: '#000', fontWeight: 600, margin: '0' }
const hrLine = { borderColor: '#e5e2dc', margin: '14px 0' }
const button = { backgroundColor: BLOOD, color: '#ffffff', padding: '14px 28px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.2em', textTransform: 'uppercase' as const, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#888', margin: '20px 0 0' }
