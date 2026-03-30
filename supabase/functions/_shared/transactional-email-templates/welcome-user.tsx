/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WelcomeUserProps {
  name?: string
}

const WelcomeUserEmail = ({ name }: WelcomeUserProps) => (
  <Html lang="el" dir="ltr">
    <Head><meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" /></Head>
    <Preview>{'\u039A\u03B1\u03BB\u03C9\u03C3\u03CC\u03C1\u03B9\u03C3\u03B5\u03C2 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F \u2014 \u039C\u03B7 \u03C7\u03AC\u03C3\u03B5\u03B9\u03C2 \u03C4\u03AF\u03C0\u03BF\u03C4\u03B1!'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{'\u03A6\u039F\u039C\u039F'}</Heading>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>
            {name
              ? <>{'\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5, '}{name}{'! \uD83D\uDC4B'}</>
              : '\u039A\u03B1\u03BB\u03C9\u03C3\u03CC\u03C1\u03B9\u03C3\u03B5\u03C2! \uD83D\uDC4B'}
          </Heading>

          <Text style={text}>
            {'\u03A7\u03B1\u03B9\u03C1\u03CC\u03BC\u03B1\u03C3\u03C4\u03B5 \u03C0\u03BF\u03C5 \u03B5\u03AF\u03C3\u03B1\u03B9 \u03C0\u03BB\u03AD\u03BF\u03BD \u03BC\u03AD\u03BB\u03BF\u03C2 \u03C4\u03BF\u03C5 '}<strong>{'\u03A6\u039F\u039C\u039F'}</strong>{' \u2014 \u03B7 \u03C0\u03BB\u03B1\u03C4\u03C6\u03CC\u03C1\u03BC\u03B1 \u03C0\u03BF\u03C5 \u03C3\u03B5 \u03BA\u03C1\u03B1\u03C4\u03AC\u03B5\u03B9 \u03B5\u03BD\u03B7\u03BC\u03B5\u03C1\u03C9\u03BC\u03AD\u03BD\u03BF \u03B3\u03B9\u03B1 \u03C4\u03B1 \u03BA\u03B1\u03BB\u03CD\u03C4\u03B5\u03C1\u03B1 events \u03BA\u03B1\u03B9 \u03C4\u03B9\u03C2 \u03C0\u03B9\u03BF hot \u03C0\u03C1\u03BF\u03C3\u03C6\u03BF\u03C1\u03AD\u03C2 \u03C3\u03C4\u03B7\u03BD \u039A\u03CD\u03C0\u03C1\u03BF.'}
          </Text>

          <Text style={text}>
            {'\u0391\u03BD\u03B1\u03BA\u03AC\u03BB\u03C5\u03C8\u03B5 \u03B5\u03BA\u03B4\u03B7\u03BB\u03CE\u03C3\u03B5\u03B9\u03C2, \u03BA\u03AC\u03BD\u03B5 \u03BA\u03C1\u03B1\u03C4\u03AE\u03C3\u03B5\u03B9\u03C2, \u03B5\u03BE\u03B1\u03C3\u03C6\u03AC\u03BB\u03B9\u03C3\u03B5 \u03B1\u03C0\u03BF\u03BA\u03BB\u03B5\u03B9\u03C3\u03C4\u03B9\u03BA\u03AD\u03C2 \u03C0\u03C1\u03BF\u03C3\u03C6\u03BF\u03C1\u03AD\u03C2 \u03BA\u03B1\u03B9 \u03BC\u03B7 \u03C7\u03AC\u03C3\u03B5\u03B9\u03C2 \u03C4\u03AF\u03C0\u03BF\u03C4\u03B1.'}
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={footerSection}>
          <Text style={footer}>
            {'\u03A6\u039F\u039C\u039F Cyprus \u2014 Never miss out!'}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeUserEmail,
  subject: '\u039A\u03B1\u03BB\u03C9\u03C3\u03CC\u03C1\u03B9\u03C3\u03B5\u03C2 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F! \uD83C\uDF89',
  displayName: 'Welcome \u2014 User',
  previewData: { name: '\u039C\u03B1\u03C1\u03AF\u03BD\u03BF\u03C2' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { maxWidth: '520px', margin: '0 auto' }
const headerSection = { 
  background: 'linear-gradient(135deg, #0D3B66 0%, #164e80 50%, #1a6b5a 100%)', 
  padding: '40px 30px 32px', 
  textAlign: 'center' as const,
}
const logo = { 
  color: '#4ECDC4', 
  fontSize: '36px', 
  fontWeight: '800' as const, 
  margin: '0', 
  letterSpacing: '4px',
}
const contentSection = { padding: '36px 30px 24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0D3B66', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.65', margin: '0 0 18px' }
const hr = { borderColor: '#e8e8e8', margin: '0' }
const footerSection = { padding: '20px 30px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0', textAlign: 'center' as const }
