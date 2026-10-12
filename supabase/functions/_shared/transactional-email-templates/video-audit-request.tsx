import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Internal notice to the Boostmate team: one new Free Video Audit request.
interface Props {
  instagram?: string
  email?: string
  channel?: string
  website?: string
  offerName?: string
  scores?: string
  submittedAt?: string
}

const Email = ({ instagram, email, channel, website, offerName, scores, submittedAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New video audit request from @{instagram ?? 'unknown'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Boostmate</Text>
        <Heading style={h1}>New Free Video Audit request</Heading>
        <Text style={text}>A visitor of the Offer Builder asked for a personalized video audit. Promised delivery: within 2 business days.</Text>
        <Section style={box}>
          <Text style={row}><b>Instagram:</b> @{instagram ?? '—'}</Text>
          <Text style={row}><b>Email:</b> {email ?? '—'}</Text>
          <Text style={row}><b>Attracting clients via:</b> {channel ?? '—'}</Text>
          <Text style={row}><b>Website:</b> {website || '—'}</Text>
          <Text style={row}><b>Offer built:</b> {offerName || 'No completed offer linked'}</Text>
          {scores ? <Text style={row}><b>Scores (before → after):</b> {scores}</Text> : null}
          <Text style={row}><b>Submitted:</b> {submittedAt ?? '—'}</Text>
        </Section>
        <Button href="https://app.boostmate.io/dashboard?module=admin-accounts" style={button}>Open audit requests</Button>
        <Hr style={hr} />
        <Text style={small}>Full details, status and notes are in Admin → Accounts → Video Audit Requests.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `New video audit request: @${d.instagram ?? 'unknown'}`,
  displayName: 'Video audit request (admin notice)',
  to: 'support@boostmate.io',
  previewData: { instagram: 'coach.mark', email: 'mark@example.com', channel: 'Referrals / networking', website: 'https://example.com', offerName: 'The Executive Edge', scores: 'Dream Outcome 6 → 7', submittedAt: '12 Oct 2026, 20:00' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 25px', maxWidth: '560px' }
const brand = { color: '#6246ff', fontWeight: 700, fontSize: '16px', margin: '0 0 16px' }
const h1 = { fontFamily: 'Manrope, Arial, sans-serif', fontSize: '22px', color: '#111827', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '22px' }
const box = { backgroundColor: '#f5f3ff', borderRadius: '10px', padding: '12px 16px', margin: '16px 0' }
const row = { fontSize: '14px', color: '#111827', margin: '4px 0' }
const button = { backgroundColor: '#6246ff', color: '#ffffff', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const small = { fontSize: '12px', color: '#6b7280' }
