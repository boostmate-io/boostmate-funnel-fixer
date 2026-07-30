/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Boostmate login link.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>Boostmate</Text>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName} and continue building
          your growth systems. This link will expire shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log in
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const eyebrow = {
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '0.08em',
  color: '#6248FF',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px',
}
const h1 = {
  fontFamily: 'Manrope, Arial, sans-serif',
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: '#131316',
  margin: '0 0 18px',
}
const text = {
  fontSize: '15px',
  color: '#5F6472',
  lineHeight: '1.6',
  margin: '0 0 22px',
}
const button = {
  backgroundColor: '#6248FF',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700' as const,
  borderRadius: '12px',
  padding: '13px 22px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#8A8F9B', margin: '32px 0 0' }
