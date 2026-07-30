/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>Boostmate</Text>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: '#131316',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#8A8F9B', margin: '32px 0 0' }
