/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WelcomeBusinessProps {
  businessName?: string
}

const WelcomeBusinessEmail = ({ businessName }: WelcomeBusinessProps) => (
  <Html lang="el" dir="ltr">
    <Head><meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" /></Head>
    <Preview>{'\u0397 \u03B5\u03C0\u03B9\u03C7\u03B5\u03AF\u03C1\u03B7\u03C3\u03AE \u03C3\u03B1\u03C2 \u03B5\u03B3\u03B3\u03C1\u03AC\u03C6\u03B7\u03BA\u03B5 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F!'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{'\u03A6\u039F\u039C\u039F'}</Heading>
          <Text style={headerSub}>for Business</Text>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>
            {businessName
              ? <>{'\u039A\u03B1\u03BB\u03C9\u03C3\u03BF\u03C1\u03AF\u03C3\u03B1\u03C4\u03B5, '}{businessName}{'!'}</>
              : '\u039A\u03B1\u03BB\u03C9\u03C3\u03BF\u03C1\u03AF\u03C3\u03B1\u03C4\u03B5!'}
          </Heading>

          <Text style={text}>
            {'\u0397 \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE \u03C3\u03B1\u03C2 \u03C3\u03C4\u03BF '}<strong>{'\u03A6\u039F\u039C\u039F'}</strong>{' \u03BF\u03BB\u03BF\u03BA\u03BB\u03B7\u03C1\u03CE\u03B8\u03B7\u03BA\u03B5 \u03B5\u03C0\u03B9\u03C4\u03C5\u03C7\u03CE\u03C2. \u0397 \u03BF\u03BC\u03AC\u03B4\u03B1 \u03BC\u03B1\u03C2 \u03B8\u03B1 \u03B5\u03BB\u03AD\u03B3\u03BE\u03B5\u03B9 \u03C4\u03B1 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1 \u03C3\u03B1\u03C2 \u03BA\u03B1\u03B9 \u03B8\u03B1 \u03B5\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03B9\u03AE\u03C3\u03B5\u03B9 \u03C4\u03BF\u03BD \u03BB\u03BF\u03B3\u03B1\u03C1\u03B9\u03B1\u03C3\u03BC\u03CC \u03C3\u03B1\u03C2 \u03C3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B1.'}
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={footerSection}>
          <Text style={footer}>
            {'\u03A6\u039F\u039C\u039F Cyprus \u2014 Grow your business.'}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeBusinessEmail,
  subject: '\u039A\u03B1\u03BB\u03C9\u03C3\u03BF\u03C1\u03AF\u03C3\u03B1\u03C4\u03B5 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F! \uD83C\uDFE2',
  displayName: 'Welcome \u2014 Business',
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
const hr = { borderColor: '#e8e8e8', margin: '0' }
const footerSection = { padding: '20px 30px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0', textAlign: 'center' as const }
