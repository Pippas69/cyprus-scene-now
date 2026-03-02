

## Σχέδιο Υλοποίησης

Αυτό το σχέδιο χωρίζεται σε **3 μέρη**: αφαίρεση Feed/Map, δυναμικό sidebar ανά κατηγορία, και νέο flow "Εισιτήριο → Αυτόματη Κράτηση".

---

### Μέρος 1: Αφαίρεση Feed & Map από Business Dashboard

**Αρχείο**: `BusinessSidebar.tsx`
- Αφαίρεση των items Feed και Map από το `dashboardItems` array
- Η ενότητα "Επισκόπηση" θα περιέχει μόνο τα "Αναλυτικά" (Analytics)
- Αλλαγή default route `/dashboard-business` ώστε να δείχνει κατευθείαν τα Analytics αντί για Feed

**Αρχείο**: `DashboardBusiness.tsx`
- Αφαίρεση του `<Route index element={<Feed />} />` και `<Route path="map" ...>`
- Το index route θα δείχνει πλέον τα Analytics: `<Route index element={<AnalyticsDashboard />} />`
- Αφαίρεση imports: `Feed`, `Xartis`

---

### Μέρος 2: Δυναμικό Sidebar ανά Κατηγορία Επιχείρησης

Κάθε τύπος επιχείρησης βλέπει μόνο τα sections που τον αφορούν:

| Κατηγορία | Εκδηλώσεις | Προσφορές | Κρατήσεις |
|-----------|------------|-----------|-----------|
| **Clubs** | ✅ | ❌ | ✅ |
| **Events** | ✅ | ❌ | ✅ |
| **Bars** | ✅ | ✅ | ✅ |
| **Pubs** | ✅ | ✅ | ✅ |
| **Fine Dining** | ✅ | ✅ | ✅ |
| **Casual Dining** | ✅ | ✅ | ✅ |
| **Theatre/Music/Dance/Kids** | ✅ | ❌ | ✅ |

**Υλοποίηση**:
- Επέκταση `useBusinessOwner` hook ώστε να φέρνει και το `category` array της επιχείρησης
- Στο `BusinessSidebar.tsx`: φιλτράρισμα `contentItems` βάσει κατηγορίας — αν η επιχείρηση είναι clubs/events/theatre/music/dance/kids, κρύβεται πλήρως η ενότητα "Προσφορές"
- Αν κάνουν navigate χειροκίνητα σε κρυμμένο URL, redirect στο index

---

### Μέρος 3: Νέο Flow "Εισιτήριο → Αυτόματη Κράτηση"

Αυτό είναι το πιο σύνθετο κομμάτι. Ουσιαστικά, για εκδηλώσεις τύπου `ticket_and_reservation`, όταν ένας χρήστης αγοράζει εισιτήρια, δημιουργείται αυτόματα κράτηση, και η τιμή του εισιτηρίου μετράει ως μέρος του minimum charge.

#### Database Changes (Migration)

1. **Νέο πεδίο `ticket_orders`**: `linked_reservation_id UUID REFERENCES reservations(id)` — συνδέει την παραγγελία εισιτηρίων με την κράτηση που δημιουργήθηκε αυτόματα
2. **Νέο πεδίο `reservations`**: `ticket_credit_cents INT DEFAULT 0` — πόσα λεφτά έχουν ήδη πληρωθεί μέσω εισιτηρίων και μετράνε στο minimum charge
3. **Νέο πεδίο `reservations`**: `auto_created_from_tickets BOOLEAN DEFAULT FALSE` — flag για να ξεχωρίζουν οι αυτόματες κρατήσεις

#### Backend Logic (Edge Function updates)

**`process-ticket-payment` webhook handler** — μετά την επιτυχή πληρωμή εισιτηρίων:
1. Αν η εκδήλωση είναι `ticket_and_reservation`, δημιουργεί αυτόματα μία κράτηση:
   - `party_size` = αριθμός εισιτηρίων
   - `ticket_credit_cents` = συνολικό ποσό εισιτηρίων (π.χ. 8 × €10 = €80)
   - `status` = `accepted` (αυτόματα, αφού πληρώθηκαν)
   - `auto_created_from_tickets` = true
   - Γεμίζει τα στοιχεία (όνομα, τηλέφωνο) από την παραγγελία εισιτηρίων
2. Ενημερώνει `ticket_orders.linked_reservation_id`

**`validate-qr` edge function** — κατά το scan εισιτηρίου:
1. Κάνει το κανονικό ticket check-in
2. Αν η παραγγελία έχει `linked_reservation_id`, κάνει αυτόματα check-in και στην κράτηση (`checked_in_at = now()`)
3. Επιστρέφει extra info: "Κράτηση: 8 άτομα, Πίστωση εισιτηρίων: €80 από minimum charge €XXX"

#### Frontend Changes

**Event Creation Form** (`EventCreationForm.tsx`):
- Όταν ο τύπος είναι `ticket_and_reservation`, εμφανίζεται επεξήγηση: "Η αγορά εισιτηρίων δημιουργεί αυτόματα κράτηση. Η τιμή των εισιτηρίων πιστώνεται στο minimum charge."

**Event Page** (user-facing):
- Για `ticket_and_reservation` events, αντί να εμφανίζονται 2 ξεχωριστά CTAs, εμφανίζεται ένα ενοποιημένο: "Αγόρασε Εισιτήριο & Κάνε Κράτηση"
- Ο χρήστης αγοράζει εισιτήρια (1 ανά άτομο) και η κράτηση δημιουργείται αυτόματα

**QR Scan Result UI** (`UnifiedQRScanner`):
- Στο success screen μετά το scan, εμφανίζεται: "✅ Check-in εισιτηρίου + Κράτηση ενεργοποιήθηκε. Πίστωση: €80/€150 minimum"

**Reservation Dashboard** (business side):
- Οι αυτόματες κρατήσεις εμφανίζουν badge "Μέσω Εισιτηρίων" και δείχνουν πόσα έχουν πληρωθεί ήδη μέσω εισιτηρίων vs πόσα απομένουν στο minimum charge

---

### Τεχνικές Λεπτομέρειες

```text
Flow: Αγορά Εισιτηρίου → Κράτηση

User buys 8 tickets (€10 each)
         │
         ▼
Stripe Payment Success
         │
         ▼
Webhook: process-ticket-payment
    ├── Creates tickets (existing flow)
    ├── IF event_type = 'ticket_and_reservation':
    │     ├── Creates reservation (party_size=8, status=accepted)
    │     ├── Sets ticket_credit_cents = 8000 (€80)
    │     └── Links ticket_order → reservation
    └── Sends confirmation email + notifications

QR Scan at venue:
    ├── Validates ticket (existing)
    ├── IF linked_reservation_id exists:
    │     └── Auto check-in reservation
    └── Shows: "Ticket ✅ + Reservation ✅ (Credit: €80)"
```

### Αρχεία που θα τροποποιηθούν

1. `BusinessSidebar.tsx` — αφαίρεση Feed/Map, δυναμικό φιλτράρισμα
2. `DashboardBusiness.tsx` — αφαίρεση Feed/Map routes, νέο index
3. `useBusinessOwner.ts` — προσθήκη `category` στο return
4. `supabase/functions/process-ticket-payment/index.ts` — auto-create reservation
5. `supabase/functions/validate-qr/index.ts` — auto check-in linked reservation
6. `EventCreationForm.tsx` — UI hint for ticket_and_reservation
7. Event detail page — ενοποιημένο CTA
8. QR scanner result UI — εμφάνιση linked reservation info
9. `DirectReservationsList.tsx` — badge "Μέσω Εισιτηρίων"
10. **Migration**: νέα πεδία σε `ticket_orders` και `reservations`

