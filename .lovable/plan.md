

## Πλάνο: Διόρθωση QR codes στα emails ώστε να σκανάρονται σωστά

### Πρόβλημα
Τα QR codes στα emails δεν μπορούν να σκαναριστούν. Υπάρχουν δύο αιτίες:

1. **`border-radius` στα QR code images**: Τα `<img>` tags έχουν `border-radius: 6px` ή `8px`, που **κόβει τις γωνίες του QR code** και καταστρέφει τα positioning patterns (τα τετράγωνα στις γωνίες). Αυτό κάνει το QR code μη αναγνωρίσιμο από scanners.

2. **Μικρό μέγεθος εμφάνισης**: Στο `send-ticket-email`, τα QR codes εμφανίζονται σε `140x140px`, που είναι πολύ μικρό για αξιόπιστη σάρωση από οθόνη κινητού.

### Αλλαγές

**1. Αφαίρεση `border-radius` από όλα τα QR code images**

- `supabase/functions/_shared/email-templates.ts` → `qrCodeSection()`: Αφαίρεση `border-radius: 8px` από το `<img>`, αύξηση μεγέθους σε `200x200px`
- `supabase/functions/send-ticket-email/index.ts`: Αφαίρεση `border-radius: 6px` από τα inline QR images, αύξηση μεγέθους από `140x140px` σε `200x200px`
- `supabase/functions/send-offer-email/index.ts`: Έλεγχος & διόρθωση αν υπάρχει border-radius
- `supabase/functions/send-offer-expiry-reminders/index.ts`: Ίδια διόρθωση
- `supabase/functions/send-reservation-reminders/index.ts`: Ίδια διόρθωση

**2. Αύξηση του source QR size**: Αλλαγή `size=400x400` σε `size=600x600` στο URL του `api.qrserver.com` για καλύτερη ανάλυση.

**3. Deploy** όλων των edge functions που αλλάζουν.

### Αρχεία
- `supabase/functions/_shared/email-templates.ts`
- `supabase/functions/send-ticket-email/index.ts`
- `supabase/functions/send-offer-email/index.ts`
- `supabase/functions/send-offer-claim-email/index.ts`
- `supabase/functions/send-offer-expiry-reminders/index.ts`
- `supabase/functions/send-reservation-reminders/index.ts`
- `supabase/functions/send-reservation-notification/index.ts`
- `supabase/functions/process-reservation-event-payment/index.ts`

### Σημείωση για το scanning
Το scanning στο ΦΟΜΟ app (UnifiedQRScanner) λειτουργεί ήδη σε κινητό, tablet και desktop — χρησιμοποιεί την κάμερα της συσκευής μέσω `qr-scanner`. Δεν χρειάζεται αλλαγή στον κώδικα scanning. Το πρόβλημα είναι αποκλειστικά στην **εμφάνιση** των QR codes στα emails.

