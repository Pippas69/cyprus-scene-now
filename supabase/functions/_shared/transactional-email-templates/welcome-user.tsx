/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ΦΟΜΟ'

interface WelcomeUserProps {
  name?: string
}

const WelcomeUserEmail = ({ name }: WelcomeUserProps) => (
  <Html lang="el" dir="ltr">
    <Head />
    <Preview>Καλωσόρισες στο ΦΟΜΟ — Μη χάσεις τίποτα!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>ΦΟΜΟ</Heading>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>
            {name ? `Γεια σου, ${name}! 👋` : 'Καλωσόρισες! 👋'}
          </Heading>

          <Text style={text}>
            Χαιρόμαστε που είσαι πλέον μέλος του <strong>ΦΟΜΟ</strong> — 
            η πλατφόρμα που σε κρατάει ενημερωμένο για τα καλύτερα events 
            και τις πιο hot προσφορές στην Κύπρο.
          </Text>

          <Text style={text}>
            Ανακάλυψε εκδηλώσεις, κάνε κρατήσεις, εξασφάλισε αποκλειστικές 
            προσφορές και μη χάσεις τίποτα.
          </Text>

          <Button href="https://fomo.com.cy/ekdiloseis" style={button}>
            Εξερεύνησε Events
          </Button>
        </Section>

        <Hr style={hr} />

        <Section style={footerSection}>
          <Text style={footer}>
            ΦΟΜΟ Cyprus — Never miss out!
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeUserEmail,
  subject: 'Καλωσόρισες στο ΦΟΜΟ! 🎉',
  displayName: 'Welcome — User',
  previewData: { name: 'Μαρίνος' },
} satisfies TemplateEntry

// Styles — Mediterranean brand: Aegean #0D3B66, Seafoam #4ECDC4
const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { maxWidth: '520px', margin: '0 auto' }
const headerSection = { 
  background: 'linear-gradient(135deg, #0D3B66 0%, #164e80 50%, #1a6b5a 100%)', 
  padding: '40px 30px 32px', 
  textAlign: 'center' as const,
  borderRadius: '0 0 0 0',
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
