

# "Hold Now, Charge Later" — Μόνο για Asmationexperience

## Σύνοψη
Το feature θα είναι διαθέσιμο **μόνο** για το business **Asmationexperience** (`bca2cb97-1723-4358-87b1-130d279e60a6`). Αντί να χτίσουμε ένα γενικό toggle στη φόρμα δημιουργίας event, θα χρησιμοποιήσουμε ένα **business-level flag** στη βάση δεδομένων. Μόνο αυτό το business θα βλέπει τις σχετικές επιλογές στο UI.

---

## Τι αλλάζει από το αρχικό σχέδιο

| Αρχικό σχέδιο | Τώρα |
|---|---|
| Toggle διαθέσιμο σε όλα τα businesses | Μόνο για Asmationexperience |
| Γενικό feature flag στο events table | Feature flag στο events table + business-level check στο UI |

Πρακτικά: οι στήλες στη βάση παραμένουν γενικές (ώστε να μπορεί να ενεργοποιηθεί και σε άλλους αργότερα), αλλά το UI εμφανίζει τις ρυθμίσεις **μόνο** αν ο χρήστης ανήκει στο Asmationexperience.

---

## Τεχνικό Σχέδιο

### 1. Database Migration
- Νέες στήλες στο `events`: `deferred_payment_enabled`, `deferred_confirmation_hours`, `deferred_cancellation_fee_percent`
- Νέες στήλες στο `reservations`: `deferred_payment_mode`, `deferred_confirmation_deadline`, `deferred_status`, `stripe_setup_intent_id`, `stripe_payment_method_id`

### 2. UI — Event Creation/Edit Forms
- Ελέγχουμε αν το `businessId` === `bca2cb97-...` (Asmationexperience)
- Μόνο τότε εμφανίζεται η ενότητα "Deferred Payment" με:
  - Toggle on/off
  - Ώρες πριν το event για deadline (αριθμός)
  - Ποσοστό χρέωσης ακύρωσης (αριθμός %)

### 3. Edge Function: `create-deferred-checkout`
- Αν event έχει `deferred_payment_enabled = true`:
  - Event εντός 7 ημερών → PaymentIntent με `capture_method: "manual"` (auth hold)
  - Event πάνω από 7 ημέρες → SetupIntent (αποθήκευση κάρτας)
- Αποθηκεύει mode + deadline στο reservation
- Reservation status = `awaiting_confirmation`

### 4. Edge Function: `confirm-deferred-reservation`
- Ο πελάτης πατάει "Confirm Attendance"
- Auth hold → capture full amount
- SetupIntent → charge saved card

### 5. Edge Function: `process-deferred-deadlines` (Cron)
- Κάθε 15 λεπτά ελέγχει reservations με περασμένο deadline
- Χρεώνει cancellation fee %
- Στέλνει push notification στον πελάτη

### 6. Customer UI
- Στις "Οι Κρατήσεις Μου": reservations με `deferred_status = awaiting_confirmation` δείχνουν countdown + κουμπί "Επιβεβαίωση Παρουσίας"
- Checkout page: σαφές μήνυμα ότι η κάρτα δεν χρεώνεται τώρα

### 7. Reminder Notifications
- Push notifications 2 ώρες και 30 λεπτά πριν το deadline

---

## Αρχεία που θα δημιουργηθούν/τροποποιηθούν

| Αρχείο | Ενέργεια |
|---|---|
| Migration SQL | Νέο — στήλες σε `events` + `reservations` |
| `EventCreationForm.tsx` | Τροποποίηση — deferred section (μόνο για Asmatio) |
| `EventEditForm.tsx` | Τροποποίηση — deferred section (μόνο για Asmatio) |
| `ReservationEventCheckout.tsx` | Τροποποίηση — deferred flow + messaging |
| `create-deferred-checkout/index.ts` | Νέο edge function |
| `confirm-deferred-reservation/index.ts` | Νέο edge function |
| `process-deferred-deadlines/index.ts` | Νέο edge function (cron) |
| User reservations page | Τροποποίηση — confirm button + countdown |

