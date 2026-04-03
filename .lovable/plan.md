

## Fix Stripe Connect Webhook - Ενημέρωση Signing Secret

### Τι θα κάνουμε
Ενημέρωση της τιμής του `STRIPE_CONNECT_WEBHOOK_SECRET` με το σωστό signing secret από το Stripe Dashboard.

### Βήματα

**Βήμα 1: Πάρε το Signing Secret από το Stripe Dashboard**
1. Πήγαινε στο **Stripe Dashboard → Developers → Webhooks**
2. Κάνε κλικ στο **"ΦΟΜΟ Stripe Connect live version"**
3. Βρες το **"Signing secret"** (κουμπί "Reveal")
4. Αντέγραψέ το (ξεκινάει με `whsec_...`)

**Βήμα 2: Ενημέρωση του secret στο project**
Θα χρησιμοποιήσω το εργαλείο `add_secret` για να ενημερώσω το `STRIPE_CONNECT_WEBHOOK_SECRET` με τη νέα τιμή.

**Βήμα 3: Re-deploy του Edge Function**
Θα κάνω deploy ξανά το `stripe-connect-webhook` function για να πάρει τη νέα τιμή.

### Τι επηρεάζεται
- **Μόνο** το `stripe-connect-webhook` edge function
- Κανένα άλλο webhook, κανένα frontend component, κανένα database table
- Μετά τη διόρθωση, τα events `account.updated` θα επεξεργάζονται κανονικά και τα πεδία `stripe_onboarding_completed` / `stripe_payouts_enabled` θα ενημερώνονται αυτόματα

### Τεχνικές λεπτομέρειες
- Το secret χρησιμοποιείται στη γραμμή 41 του `stripe-connect-webhook/index.ts` για signature verification μέσω `stripe.webhooks.constructEventAsync()`
- Χωρίς σωστό secret, το function πέφτει στο fallback `JSON.parse(body)` που αποτυγχάνει με `Unexpected end of JSON input`

