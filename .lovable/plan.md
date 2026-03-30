

## Πλάνο: Διόρθωση Fresh Signup Flow & Εμφάνιση Πόλης στις Λεπτομέρειες

### Πρόβλημα 1: Fresh Signup ζητάει ξανά τηλέφωνο/email
Το `isFreshSignup` αρχικοποιείται ως `false` και **δεν γίνεται ποτέ `true`**. Έτσι τα πεδία τηλεφώνου/email εμφανίζονται πάντα, ακόμα κι αν ο χρήστης μόλις έκανε signup.

### Πρόβλημα 2: Εισιτήρια & Ονόματα σε ξεχωριστά βήματα
Ο χρήστης θέλει σε fresh signup (non-seated), το βήμα "tickets" να περιλαμβάνει **και** τα ονόματα καλεσμένων κάτω από τα εισιτήρια — χωρίς να αλλάζει dialog.

### Πρόβλημα 3: Πόλη δεν φαίνεται στις Λεπτομέρειες
Στο ticket-only view η πόλη εμφανίζεται σωστά, αλλά στα reservation/hybrid views η στήλη "Λεπτομέρειες" δείχνει μόνο party size & ηλικία χωρίς πόλη.

---

### Αλλαγές

**Αρχείο 1: `src/components/tickets/TicketPurchaseFlow.tsx`**

1. **Fix `isFreshSignup`**: Στο `renderProfileStep` → `onComplete`, set `setIsFreshSignup(true)` αν `!wasAuthenticatedOnMount`. Αυτό θα αποκρύψει τα πεδία phone/email στο guests step.

2. **Συγχώνευση tickets + guests σε ένα step**: Για non-seated events + fresh signup:
   - Στο `renderTicketsStep`, αν `isFreshSignup && !hasSeating`, εμφάνιση guest names/ages κάτω από τους ticket tiers (μόλις `totalTickets > 0`)
   - Αφαίρεση του ξεχωριστού 'guests' step από τα steps array όταν `isFreshSignup && !hasSeating`
   - Μετά τα tickets → κατευθείαν checkout

3. **Auto-fill phone/email**: Στο `renderProfileStep` → `onComplete`, set `customerPhone` και `customerEmail` από τα profile data, ώστε να χρησιμοποιηθούν στο checkout χωρίς re-entry.

**Αρχείο 2: `src/components/business/reservations/DirectReservationsList.tsx`**

4. **Πόλη στα reservation/hybrid views**: Στη στήλη "Λεπτομέρειες" (γύρω από γραμμές 1292-1302 και 1450-1462), προσθήκη εμφάνισης πόλης:
   - Fetch πόλη από profiles table (ίδια λογική με τα ticket-only orders) για reservations που έχουν `user_id`
   - Εμφάνιση `<MapPin>` + πόλη δίπλα στην ηλικία
   - Για reservations χωρίς user_id (manual/ghost), εμφάνιση "—"

### Τεχνικές Λεπτομέρειες

```text
FRESH SIGNUP FLOW (non-seated):
Step 1: Auth (email/password)
Step 2: OTP verification  
Step 3: Profile (name, phone, city)
Step 4: Tickets + Guest Names (merged) ← ΝΕΟ
Step 5: Checkout/Payment

RETURNING USER FLOW (non-seated):
Step 1: Auth
Step 2: Tickets
Step 3: Guests (with phone/email fields)
Step 4: Checkout
```

- `isFreshSignup` = `true` αν ο χρήστης δεν ήταν authenticated κατά το mount **ΚΑΙ** πέρασε από profile completion
- `getSteps()` θα παραλείψει το 'guests' step όταν `isFreshSignup && !hasSeating` (τα guest fields ενσωματώνονται στο tickets step)
- Για seated events, η λογική παραμένει ίδια (separate guests step)

### Αρχεία που θα τροποποιηθούν
- `src/components/tickets/TicketPurchaseFlow.tsx`
- `src/components/business/reservations/DirectReservationsList.tsx`

