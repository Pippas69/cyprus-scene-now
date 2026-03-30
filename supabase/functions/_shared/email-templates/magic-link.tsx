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
  Preview,
  Section,
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
  <Html lang="el" dir="ltr">
    <Head><meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" /></Head>
    <Preview>{'\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03BC\u03BF\u03C2 \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7\u03C2 \u2014 \u03A6\u039F\u039C\u039F'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoIcon}>{'\u03A6\u039F\u039C\u039F'}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>{'\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F \u2728'}</Heading>
        <Text style={text}>
          {'\u03A0\u03AC\u03C4\u03B7\u03C3\u03B5 \u03C4\u03BF \u03C0\u03B1\u03C1\u03B1\u03BA\u03AC\u03C4\u03C9 \u03BA\u03BF\u03C5\u03BC\u03C0\u03AF \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03C3\u03C5\u03BD\u03B4\u03B5\u03B8\u03B5\u03AF\u03C2. \u039F \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03BC\u03BF\u03C2 \u03BB\u03AE\u03B3\u03B5\u03B9 \u03C3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B1.'}
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            {'\u03A3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7'}
          </Button>
        </Section>
        <Text style={footer}>
          {'\u0391\u03BD \u03B4\u03B5\u03BD \u03B6\u03AE\u03C4\u03B7\u03C3\u03B5\u03C2 \u03B5\u03C3\u03CD \u03B1\u03C5\u03C4\u03CC\u03BD \u03C4\u03BF\u03BD \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03BC\u03BF, \u03B1\u03B3\u03BD\u03CC\u03B7\u03C3\u03B5 \u03B1\u03C5\u03C4\u03CC \u03C4\u03BF email.'}
        </Text>
        <Hr style={divider} />
        <Text style={brand}>{'\u00A9 2026 \u03A6\u039F\u039C\u039F \u00B7 fomo.com.cy'}</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '16px' }
const logoIcon = { display: 'inline-block' as const, padding: '8px 16px', borderRadius: '24px', backgroundColor: '#0D3B66', color: '#ffffff', fontSize: '20px', fontWeight: 'bold' as const, textAlign: 'center' as const, margin: '0 auto', letterSpacing: '3px' }
const divider = { borderColor: '#e2e8f0', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0D3B66', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#0D3B66', color: '#ffffff', fontSize: '14px', borderRadius: '16px', padding: '12px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
const brand = { fontSize: '11px', color: '#cbd5e1', textAlign: 'center' as const, margin: '0' }
