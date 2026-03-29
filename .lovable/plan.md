

## Πλάνο: Ενοποίηση UX σε όλα τα checkout flows (Events)

### Αλλαγές

**1. Αφαίρεση Google/Apple Sign-In** (`InlineAuthGate.tsx`)
- Αφαίρεση κουμπιών Google & Apple, divider "ή συνεχίστε με", και σχετικών functions
- Μόνο Email/Password signup + login + OTP verification

**2. Μετονομασίες Step Labels** (3 αρχεία)
- `TicketPurchaseFlow.tsx`: step "guests" → "Ονόματα Καλεσμένων", step "checkout" → "Σύνοψη"
- `KalivaTicketReservationFlow.tsx`: step "details" → "Στοιχεία Παρέας" (ήδη OK), step "review" → "Σύνοψη"
- `ReservationEventCheckout.tsx`: step "details" → "Στοιχεία Παρέας", step "review" → "Σύνοψη"

**3. Αφαίρεση "Κάθε άτομο θα λάβει ξεχωριστό QR code" από guest step** (`TicketPurchaseFlow.tsx`)
- Αφαίρεση της γραμμής `eachPersonGetsQR` από το renderGuestsStep (παραμένει μόνο στο checkout/σύνοψη)

**4. Λογική Phone/Email — Ήδη συνδεδεμένοι vs Fresh Signup** (3 αρχεία)
- **Fresh signup** (profileComplete γίνεται true κατά τη διάρκεια του checkout): Τα πεδία phone/email κρύβονται (auto-filled)
- **Ήδη συνδεδεμένοι** (ο χρήστης είχε account πριν ανοίξει το dialog): Τα πεδία phone/email εμφανίζονται ΠΑΝΤΑ κενά, υποχρεωτικά
- Υλοποίηση: Νέο flag `isFreshSignup` — γίνεται `true` μόνο όταν το ProfileCompletionGate ολοκληρωθεί μέσα στο checkout. Αν ο χρήστης ήταν ήδη authenticated κατά το mount, `isFreshSignup = false`
- **TicketPurchaseFlow**: Αλλαγή visibility logic: `!isFreshSignup` → δείξε phone + email
- **KalivaTicketReservationFlow**: Ίδια αλλαγή
- **ReservationEventCheckout**: Ίδια αλλαγή

**5. Αφαίρεση "Πολιτικές" (no-show policy)** από review step (`ReservationEventCheckout.tsx`)
- Αφαίρεση του section "Πολιτικές" + no_show_policy text από step 3

**6. Μικρότερα γράμματα στο Terms checkbox** (3 αρχεία)
- Αλλαγή terms label σε `text-[10px] sm:text-xs` αντί `text-xs sm:text-sm` σε όλα τα checkout dialogs

**7. Αφαίρεση "Πληρώνεται στο κατάστημα..." από step 2** (`KalivaTicketReservationFlow.tsx`)
- Η πληροφορία "Πληρώνεται στο κατάστημα (η τιμή των εισιτηρίων συμπεριλαμβάνεται στο τελικό ποσό)" εμφανίζεται μόνο στο step 3 (Σύνοψη)

### Αρχεία
- `src/components/tickets/InlineAuthGate.tsx`
- `src/components/tickets/TicketPurchaseFlow.tsx`
- `src/components/tickets/KalivaTicketReservationFlow.tsx`
- `src/components/user/ReservationEventCheckout.tsx`

