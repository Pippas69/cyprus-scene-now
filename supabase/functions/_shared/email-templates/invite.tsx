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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="el" dir="ltr">
    <Head />
    <Preview>Σε προσκαλέσαμε στο ΦΟΜΟ!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoIcon}>Φ</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Πρόσκληση 🎊</Heading>
        <Text style={text}>
          Σε προσκαλέσαμε στο{' '}
          <Link href={siteUrl} style={link}>
            <strong>ΦΟΜΟ</strong>
          </Link>
          ! Πάτησε το παρακάτω κουμπί για να αποδεχτείς την πρόσκληση και να δημιουργήσεις τον λογαριασμό σου.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Αποδοχή Πρόσκλησης
          </Button>
        </Section>
        <Text style={footer}>
          Αν δεν περίμενες αυτή την πρόσκληση, αγνόησε αυτό το email.
        </Text>
        <Hr style={divider} />
        <Text style={brand}>© 2026 ΦΟΜΟ · fomo.com.cy</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '16px' }
const logoIcon = { display: 'inline-block' as const, width: '48px', height: '48px', lineHeight: '48px', borderRadius: '50%', backgroundColor: '#0D3B66', color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, textAlign: 'center' as const, margin: '0 auto', letterSpacing: '0' }
const divider = { borderColor: '#e2e8f0', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0D3B66', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#4ECDC4', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#0D3B66', color: '#ffffff', fontSize: '14px', borderRadius: '16px', padding: '12px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
const brand = { fontSize: '11px', color: '#cbd5e1', textAlign: 'center' as const, margin: '0' }
