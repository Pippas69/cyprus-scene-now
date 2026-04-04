

## Αλλαγή email σε `support@fomo.com.cy` — Όλα τα 9 αρχεία

Αντικατάσταση του `support@fomocy.com` με `support@fomo.com.cy` παντού, ώστε να ταιριάζει με το verified domain στο Resend.

### Αλλαγές

Σε κάθε αρχείο: `mailto:support@fomocy.com` → `mailto:support@fomo.com.cy` και displayed text αντίστοιχα.

1. **`src/components/Footer.tsx`** — social icon mailto + support email link/text
2. **`src/pages/Contact.tsx`** — contact info
3. **`src/pages/ForBusinesses.tsx`** — enterprise contact
4. **`src/pages/PricingPublic.tsx`** — enterprise contact
5. **`src/pages/CookiesPolicy.tsx`** — contact section
6. **`src/pages/LicenseAgreement.tsx`** — contact section
7. **`src/pages/TermsOfService.tsx`** — contact section
8. **`src/pages/PrivacyPolicy.tsx`** — contact section
9. **`.memory/technical/email/resend-integration.md`** — documentation

### Σημείωση
- Στο footer mobile, θα εμφανίζεται `support@fomo.com` (κρύβοντας το `.cy`) για να χωράει
- Τώρα UI και backend χρησιμοποιούν το ίδιο email: `support@fomo.com.cy`

