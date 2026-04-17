/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  businessName?: string
  declineReason?: string | null
}

const PromoterDeclinedEmail = ({ name, businessName, declineReason }: Props) => (
  <Html lang="el" dir="ltr">
    <Head><meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" /></Head>
    <Preview>{`Η αίτησή σου ως Promoter${businessName ? ` στην ${businessName}` : ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{'\u03A6\u039F\u039C\u039F'}</Heading>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>
            {name ? `Γεια σου, ${name}` : 'Γεια σου'}
          </Heading>
          <Text style={text}>
            Η αίτησή σου ως <strong>Promoter</strong>
            {businessName ? ` στην επιχείρηση "${businessName}"` : ''}
            {' '}δεν εγκρίθηκε αυτή τη στιγμή.
          </Text>

          {declineReason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>Λόγος:</Text>
              <Text style={reasonText}>{declineReason}</Text>
            </Section>
          )}

          <Text style={text}>
            Μπορείς πάντα να δοκιμάσεις ξανά αργότερα ή να στείλεις αίτημα σε άλλη επιχείρηση από
            τις ρυθμίσεις του λογαριασμού σου.
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
  component: PromoterDeclinedEmail,
  subject: (data: Record<string, any>) =>
    data?.businessName
      ? `Η αίτησή σου ως Promoter στην ${data.businessName}`
      : 'Ενημέρωση για την αίτησή σου ως Promoter',
  displayName: 'Promoter — Απόρριψη αίτησης',
  previewData: { name: 'Γιώργος', businessName: 'Amor Club', declineReason: 'Δεν αναζητούμε νέους PRs αυτή τη στιγμή.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0F172A', letterSpacing: '2px', margin: 0 }
const contentSection = { padding: '0 4px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const reasonBox = { backgroundColor: '#F9FAFB', borderLeft: '3px solid #9CA3AF', padding: '10px 14px', margin: '12px 0', borderRadius: '4px' }
const reasonLabel = { fontSize: '11px', color: '#6B7280', fontWeight: 'bold' as const, margin: '0 0 4px', textTransform: 'uppercase' as const }
const reasonText = { fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.5' }
const hr = { borderColor: '#E5E7EB', margin: '24px 0' }
const footerSection = { textAlign: 'center' as const }
const footer = { fontSize: '11px', color: '#9CA3AF', margin: 0 }
