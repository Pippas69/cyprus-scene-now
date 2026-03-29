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
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  token,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="el" dir="ltr">
    <Head><meta charSet="utf-8" /></Head>
    <Preview>{'Ο κωδικός επαλήθευσής σου για το ΦΟΜΟ'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoIcon}>{'\u03A6\u039F\u039C\u039F'}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>{'Επαλήθευσε τον λογαριασμό σου'}</Heading>
        <Text style={text}>
          {'Ευχαριστούμε για την εγγραφή σου στο ΦΟΜΟ! Χρησιμοποίησε τον παρακάτω κωδικό για να επαληθεύσεις τον λογαριασμό σου:'}
        </Text>
        {token ? (
          <Section style={codeSection}>
            <Text style={codeText}>{token}</Text>
          </Section>
        ) : confirmationUrl ? (
          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>
              {'Επαλήθευση Email →'}
            </Button>
          </Section>
        ) : null}
        <Text style={text}>
          {'Ο κωδικός αυτός ισχύει για 15 λεπτά. Αν δεν ζήτησες εσύ αυτόν τον κωδικό, αγνόησε αυτό το email.'}
        </Text>
        <Text style={footer}>
          {'Αν δεν δημιούργησες εσύ λογαριασμό, αγνόησε αυτό το email.'}
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
const codeSection = { textAlign: 'center' as const, margin: '24px 0', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '12px' }
const codeText = { fontSize: '32px', fontWeight: 'bold' as const, color: '#0D3B66', letterSpacing: '6px', margin: '0', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
const brand = { fontSize: '11px', color: '#cbd5e1', textAlign: 'center' as const, margin: '0' }
