/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
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
}: SignupEmailProps) => (
  <Html lang="el" dir="ltr">
    <Head><meta charSet="utf-8" /></Head>
    <Preview>{'\u039A\u03B1\u03BB\u03CE\u03C2 \u03AE\u03C1\u03B8\u03B5\u03C2 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F! \uD83C\uDF89'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoIcon}>{'\u03A6\u039F\u039C\u039F'}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>{'\u039A\u03B1\u03BB\u03CE\u03C2 \u03AE\u03C1\u03B8\u03B5\u03C2! \uD83C\uDF89'}</Heading>
        <Text style={text}>
          {'\u0397 \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE \u03C3\u03BF\u03C5 \u03C3\u03C4\u03BF'}{' '}
          <Link href={siteUrl} style={link}>
            <strong>{'\u03A6\u039F\u039C\u039F'}</strong>
          </Link>{' '}
          {'\u03BF\u03BB\u03BF\u03BA\u03BB\u03B7\u03C1\u03CE\u03B8\u03B7\u03BA\u03B5 \u03B5\u03C0\u03B9\u03C4\u03C5\u03C7\u03CE\u03C2!'}
        </Text>
        <Text style={text}>
          {'\u039C\u03C0\u03BF\u03C1\u03B5\u03AF\u03C2 \u03C4\u03CE\u03C1\u03B1 \u03BD\u03B1 \u03B1\u03BD\u03B1\u03BA\u03B1\u03BB\u03CD\u03C8\u03B5\u03B9\u03C2 \u03C4\u03B1 \u03BA\u03B1\u03BB\u03CD\u03C4\u03B5\u03C1\u03B1 events, \u03C0\u03C1\u03BF\u03C3\u03C6\u03BF\u03C1\u03AD\u03C2 \u03BA\u03B1\u03B9 \u03B5\u03BC\u03C0\u03B5\u03B9\u03C1\u03AF\u03B5\u03C2 \u03C3\u03C4\u03B7\u03BD \u039A\u03CD\u03C0\u03C1\u03BF.'}
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={siteUrl}>
            {'\u039E\u03B5\u03BA\u03AF\u03BD\u03B1 \u03A4\u03CE\u03C1\u03B1 \u2192'}
          </Button>
        </Section>
        <Text style={footer}>
          {'\u0391\u03BD \u03B4\u03B5\u03BD \u03B4\u03B7\u03BC\u03B9\u03BF\u03CD\u03C1\u03B3\u03B7\u03C3\u03B5\u03C2 \u03B5\u03C3\u03CD \u03BB\u03BF\u03B3\u03B1\u03C1\u03B9\u03B1\u03C3\u03BC\u03CC, \u03B1\u03B3\u03BD\u03CC\u03B7\u03C3\u03B5 \u03B1\u03C5\u03C4\u03CC \u03C4\u03BF email.'}
        </Text>
        <Hr style={divider} />
        <Text style={brand}>{'\u00A9 2026 \u03A6\u039F\u039C\u039F \u00B7 fomo.com.cy'}</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '16px' }
const logoIcon = { display: 'inline-block' as const, padding: '8px 16px', borderRadius: '24px', backgroundColor: '#0D3B66', color: '#ffffff', fontSize: '20px', fontWeight: 'bold' as const, textAlign: 'center' as const, margin: '0 auto', letterSpacing: '3px' }
const divider = { borderColor: '#e2e8f0', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0D3B66', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#4ECDC4', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#0D3B66', color: '#ffffff', fontSize: '14px', borderRadius: '16px', padding: '12px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
const brand = { fontSize: '11px', color: '#cbd5e1', textAlign: 'center' as const, margin: '0' }
