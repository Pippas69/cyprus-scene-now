/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ΦΟΜΟ'

interface WelcomeBusinessProps {
  businessName?: string
}

const WelcomeBusinessEmail = ({ businessName }: WelcomeBusinessProps) => (
  <Html lang="el" dir="ltr">
    <Head><meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" /></Head>
    <Preview>{'Η επιχείρησή σας εγγράφηκε στο ΦΟΜΟ!'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{'\u03A6\u039F\u039C\u039F'}</Heading>
          <Text style={headerSub}>for Business</Text>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>
            {'Καλωσορίσατε!'}
          </Heading>

          <Text style={text}>
            {'Η εγγραφή σας στο '}<strong>{'\u03A6\u039F\u039C\u039F'}</strong>{' ολοκληρώθηκε επιτυχώς. Η ομάδα μας θα ελέγξει τα στοιχεία σας και θα ενεργοποιήσει τον λογαριασμό σας σύντομα.'}
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={footerSection}>
          <Text style={footer}>
            ΦΟΜΟ Cyprus — Grow your business.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeBusinessEmail,
  subject: 'Καλωσορίσατε στο ΦΟΜΟ! 🏢',
  displayName: 'Welcome — Business',
  previewData: { businessName: 'Kaliva on the Beach' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { maxWidth: '520px', margin: '0 auto' }
const headerSection = { 
  background: 'linear-gradient(135deg, #0D3B66 0%, #164e80 50%, #1a6b5a 100%)', 
  padding: '36px 30px 28px', 
  textAlign: 'center' as const,
}
const logo = { 
  color: '#4ECDC4', 
  fontSize: '36px', 
  fontWeight: '800' as const, 
  margin: '0', 
  letterSpacing: '4px',
}
const headerSub = {
  color: '#ffffff',
  fontSize: '13px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '6px 0 0',
  opacity: '0.85',
}
const contentSection = { padding: '36px 30px 24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0D3B66', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.65', margin: '0 0 18px' }
const button = {
  backgroundColor: '#0D3B66',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  textAlign: 'center' as const,
  marginTop: '4px',
}
const hr = { borderColor: '#e8e8e8', margin: '0' }
const footerSection = { padding: '20px 30px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0', textAlign: 'center' as const }
