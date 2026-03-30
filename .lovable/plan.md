

## Διόρθωση Email Templates — Encoding bugs και απλοποίηση

### Πρόβλημα
Τα emails εμφανίζουν `�` αντί για ελληνικούς χαρακτήρες (π.χ. "Λά��αμε" αντί "Λάβαμε"). Επίσης τα welcome emails έχουν περιττό περιεχόμενο (κουμπιά, παραγράφους).

### Αιτία
Πιθανό encoding issue κατά το render. Ορισμένα templates λείπει η `<meta charset>` στο `<Head>`. Θα προστεθεί `<meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />` σε όλα τα templates (πιο αξιόπιστο για email clients).

### Αλλαγές

#### 1. Auth Email Templates (6 αρχεία)
Σε κάθε template στο `_shared/email-templates/`:
- **recovery.tsx, invite.tsx, magic-link.tsx, email-change.tsx, reauthentication.tsx, signup.tsx**: Αντικατάσταση `<meta charSet="utf-8" />` ή κενού `<Head />` με:
  ```tsx
  <Head>
    <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
  </Head>
  ```

#### 2. Welcome Business (`welcome-business.tsx`)
- Προσθήκη charset meta
- Αφαίρεση δεύτερης παραγράφου ("Μόλις εγκριθεί ο λογαριασμός σας...")
- Αφαίρεση κουμπιού "Μάθετε Περισσότερα"

#### 3. Welcome User (`welcome-user.tsx`)
- Προσθήκη charset meta
- Αφαίρεση κουμπιού "Εξερεύνησε Events"

#### 4. Deploy
- Deploy `auth-email-hook`, `send-transactional-email`, `preview-transactional-email` για να πάρουν τα updated templates

### Αρχεία
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`
- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/transactional-email-templates/welcome-business.tsx`
- `supabase/functions/_shared/transactional-email-templates/welcome-user.tsx`

