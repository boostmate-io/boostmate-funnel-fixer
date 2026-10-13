import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Sent to the visitor who requested their Offer Blueprint PDF.
interface Props { offerName?: string; downloadUrl?: string; auditRequested?: boolean }

const Email = ({ offerName, downloadUrl, auditRequested }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your personalized Irresistible Offer Blueprint is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Boostmate</Text>
        <Heading style={h1}>Your Irresistible Offer Blueprint is ready</Heading>
        <Text style={text}>Hi,</Text>
        <Text style={text}>Your personalized Irresistible Offer Blueprint{offerName ? <> for <b>{offerName}</b></> : null} is ready.</Text>
        <Text style={text}>Inside, you'll find your improved offer, your Before/After Value Equation assessment, and practical recommendations to make your offer more compelling.</Text>
        {downloadUrl ? <Button href={downloadUrl} style={button}>Download your Offer Blueprint (PDF)</Button> : null}
        <Text style={small}>This private download link stays valid for 30 days. Save the PDF to keep it.</Text>
        {auditRequested ? (
          <Section style={box}>
            <Text style={row}>We've also received your request for a free Client Acquisition Video Audit. We'll review your setup and aim to send your personalized video within 2 business days.</Text>
          </Section>
        ) : null}
        <Text style={text}>Best,<br />The Boostmate Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Irresistible Offer Blueprint — Boostmate',
  displayName: 'Offer Blueprint (visitor)',
  previewData: { offerName: 'The Executive Edge', downloadUrl: 'https://boostmate.io', auditRequested: true },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 25px', maxWidth: '560px' }
const brand = { color: '#6246ff', fontWeight: 700, fontSize: '16px', margin: '0 0 16px' }
const h1 = { fontFamily: 'Manrope, Arial, sans-serif', fontSize: '22px', color: '#111827', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '22px' }
const box = { backgroundColor: '#f5f3ff', borderRadius: '10px', padding: '4px 16px', margin: '16px 0' }
const row = { fontSize: '14px', color: '#111827', lineHeight: '22px' }
const button = { backgroundColor: '#6246ff', color: '#ffffff', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', margin: '8px 0' }
const small = { fontSize: '12px', color: '#6b7280' }
