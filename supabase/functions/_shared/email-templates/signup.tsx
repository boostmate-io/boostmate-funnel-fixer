/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email and keep building your Growth Roadmap.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>Boostmate</Text>
        <Heading style={h1}>Confirm your account</Heading>
        <Text style={text}>
          Thanks for starting your Growth Roadmap with{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) so your roadmap can be saved to your workspace.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm account
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#6248FF', textDecoration: 'underline' }
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
