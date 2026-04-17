/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://fomo.com.cy'

interface Props {
  name?: string
  businessName?: string
}

const PromoterAcceptedEmail = ({ name, businessName }: Props) => (
  <Html lang="el" dir="ltr">
    <Head><meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" /></Head>
    <Preview>{`Έγινες Promoter${businessName ? ` στην ${businessName}` : ''}! 🎉`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{'\u03A6\u039F\u039C\u039F'}</Heading>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>
            {name ? `Συγχαρητήρια, ${name}! 🎉` : 'Συγχαρητήρια! 🎉'}
          </Heading>
          <Text style={text}>
            Η αίτησή σου ως <strong>Promoter</strong>
            {businessName ? ` στην επιχείρηση "${businessName}"` : ''} εγκρίθηκε.
          </Text>
          <Text style={text}>
            Από την επιλογή <strong>«PR Dashboard»</strong> στο μενού του λογαριασμού σου, μπορείς
            πλέον να δημιουργείς μοναδικά links για events, να μοιράζεσαι QR codes και να
            παρακολουθείς πωλήσεις και αμοιβές σε πραγματικό χρόνο.
          </Text>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={`${SITE_URL}/dashboard-user`} style={button}>
              Άνοιγμα Dashboard
            </Button>
          </Section>

          <Text style={textSmall}>
            💡 Tip: Κάθε link σου είναι μοναδικό. Όσοι αγοράζουν μέσω του link σου καταγράφονται
            αυτόματα και βλέπεις την αμοιβή σου άμεσα.
          </Text>
        </Section>

        <Hr style={hr} />
        <Section style={footerSection}>
          <Text style={footer}>ΦΟΜΟ Cyprus — Never miss out!</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PromoterAcceptedEmail,
  subject: (data: Record<string, any>) =>
    data?.businessName
      ? `Έγινες Promoter στην ${data.businessName}! 🎉`
      : 'Η αίτησή σου ως Promoter εγκρίθηκε! 🎉',
  displayName: 'Promoter — Έγκριση αίτησης',
  previewData: { name: 'Γιώργος', businessName: 'Amor Club' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0F172A', letterSpacing: '2px', margin: 0 }
const contentSection = { padding: '0 4px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const textSmall = { fontSize: '12px', color: '#6B7280', lineHeight: '1.5', margin: '12px 0 0' }
const button = {
  backgroundColor: '#3B82F6',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E5E7EB', margin: '24px 0' }
const footerSection = { textAlign: 'center' as const }
const footer = { fontSize: '11px', color: '#9CA3AF', margin: 0 }
