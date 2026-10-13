import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Internal notice to the Boostmate team for every Offer Blueprint submission.
type Pair = { label: string; value: string }
interface Props {
  email?: string; submittedAt?: string; auditRequested?: boolean; marketingConsent?: boolean
  original?: Pair[]; improved?: Pair[]; decisions?: string[]; audit?: Pair[]; downloadUrl?: string
}

const Rows = ({ items }: { items?: Pair[] }) => <>{(items ?? []).filter((p) => p.value).map((p) => <Text key={p.label} style={row}><b>{p.label}:</b> {p.value}</Text>)}</>

const Email = ({ email, submittedAt, auditRequested, marketingConsent, original, improved, decisions, audit, downloadUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{auditRequested ? 'New video audit request' : 'New Offer Blueprint lead'} — {email ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Boostmate</Text>
        <Heading style={h1}>{auditRequested ? 'New Video Audit Request' : 'New Offer Blueprint Lead'}</Heading>
        <Text style={h2}>Lead information</Text>
        <Section style={box}>
          <Rows items={[
            { label: 'Email', value: email ?? '' }, { label: 'Submitted', value: submittedAt ?? '' },
            { label: 'Lead type', value: auditRequested ? 'PDF + Video Audit' : 'PDF only' },
            { label: 'Marketing consent', value: marketingConsent ? 'Yes' : 'No' },
          ]} />
        </Section>
        {auditRequested ? (<>
          <Text style={h2}>Video audit</Text>
          <Section style={box}><Text style={row}><b>The visitor explicitly requested the free Client Acquisition Video Audit (deliver within 2 business days).</b></Text><Rows items={audit} /></Section>
        </>) : null}
        <Text style={h2}>Original offer (Discover answers)</Text>
        <Section style={box}><Rows items={original} /></Section>
        <Text style={h2}>Improved offer</Text>
        <Section style={box}>
          <Rows items={improved} />
          {(decisions ?? []).length ? <><Text style={row}><b>Selected improvements:</b></Text>{decisions!.map((d) => <Text key={d} style={row}>• {d}</Text>)}</> : null}
        </Section>
        {downloadUrl ? <Button href={downloadUrl} style={button}>Download the visitor's Offer Blueprint (PDF)</Button> : null}
        <Text style={small}>The PDF link is private and valid for 30 days.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${d.auditRequested ? 'New Video Audit Request' : 'New Offer Blueprint Lead'} — ${d.email ?? 'unknown'}`,
  displayName: 'Offer Blueprint lead (admin notice)',
  to: 'support@boostmate.io',
  previewData: {
    email: 'mark@example.com', submittedAt: '13 Oct 2026, 09:00 UTC', auditRequested: true, marketingConsent: false,
    original: [{ label: 'Status', value: 'Existing offer' }, { label: 'Audience', value: 'Busy executives' }],
    improved: [{ label: 'Name', value: 'The Executive Edge' }, { label: 'Scores (before → after)', value: 'Dream Outcome 6 → 7' }],
    decisions: ['Proof: Add case studies'], audit: [{ label: 'Instagram', value: '@coach.mark' }], downloadUrl: 'https://boostmate.io',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 25px', maxWidth: '600px' }
const brand = { color: '#6246ff', fontWeight: 700, fontSize: '16px', margin: '0 0 16px' }
const h1 = { fontFamily: 'Manrope, Arial, sans-serif', fontSize: '22px', color: '#111827', margin: '0 0 12px' }
const h2 = { fontFamily: 'Manrope, Arial, sans-serif', fontSize: '15px', fontWeight: 700, color: '#111827', margin: '20px 0 0' }
const box = { backgroundColor: '#f5f3ff', borderRadius: '10px', padding: '8px 16px', margin: '8px 0' }
const row = { fontSize: '14px', color: '#111827', margin: '4px 0', lineHeight: '20px' }
const button = { backgroundColor: '#6246ff', color: '#ffffff', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', margin: '16px 0 4px' }
const small = { fontSize: '12px', color: '#6b7280' }
