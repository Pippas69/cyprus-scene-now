

## Σχέδιο: Όνομα Κράτησης στα emails πώλησης εισιτηρίων (hybrid)

### Τι εντόπισα

**Φωτογραφία 1** — Business email πώλησης εισιτηρίων (`send-ticket-sale-notification`):
- Γραμμή `Πελάτης: Marinos Koumi` δείχνει το **profile name** του αγοραστή (`ticket_orders.customer_name`), όχι το `reservation_name` που πληκτρολόγησε στο dialog ("Agamemnonas Paraskevas").

**Φωτογραφία 2/3** — Στα hybrid events ο πελάτης πληκτρολογεί ένα `reservation_name` στο dialog. Αυτό σώζεται στο `reservations.reservation_name` της linked κράτησης (μέσω `process-ticket-payment`, line 305/315), αλλά **δεν περνιέται** στα emails.

**Customer email** (`send-ticket-email`): Η κάρτα "Λεπτομέρειες" δείχνει Ημερομηνία / Ώρα / Τοποθεσία / Άτομα — **λείπει** το "Όνομα Κράτησης" πάνω από την Τοποθεσία.

**Ώρα/Timezone**: Όλα τα email functions ήδη χρησιμοποιούν `hour12: false` + `timeZone: 'Europe/Nicosia'` (24h, Κύπρος). **Δεν χρειάζεται καμία αλλαγή** εδώ.

### Αλλαγές

**1. `supabase/functions/process-ticket-payment/index.ts`**
- Διαβάζω το `reservation_name` από το `session.metadata` (ήδη υπάρχει — line 305) ως `reservationName`.
- Όταν είναι hybrid (`usesLinkedReservations && seatingTypeId`):
  - Περνάω επιπλέον πεδίο `reservationName` στα body του `send-ticket-email` (customer) και `send-ticket-sale-notification` (business).
- Στο business push/in-app notification (lines 518, 544): αλλάζω `customerName || 'Πελάτης'` → `reservationName || customerName || 'Πελάτης'` ώστε να εμφανίζει το όνομα κράτησης σε hybrid πωλήσεις.

**2. `supabase/functions/send-ticket-sale-notification/index.ts`**
- Προσθέτω optional πεδίο `reservationName` στο schema.
- Στην κάρτα "Λεπτομέρειες" (line 117):
  - Αν υπάρχει `reservationName`: γραμμή `detailRow('Όνομα Κράτησης', reservationName)` αντί για `detailRow('Πελάτης', customerName)`.
  - Αν δεν υπάρχει (pure ticket χωρίς reservation): παραμένει η υπάρχουσα γραμμή `Πελάτης` (zero regression για non-hybrid).

**3. `supabase/functions/send-ticket-email/index.ts`** (customer email)
- Προσθέτω optional `reservationName` στο schema.
- Στο block `infoRows` (lines 158-169), όταν υπάρχει `reservationName`:
  - Προσθέτω `detailRow('Όνομα Κράτησης', reservationName)` **πάνω από** την Τοποθεσία (πριν το `eventLocation`).

**4. `supabase/functions/process-reservation-event-payment/index.ts`** (pure reservation events — το business email ήδη δείχνει `reservation.reservation_name`)
- Αλλάζω μόνο το label στη γραμμή 567: `detailRow('Πελάτης', ...)` → `detailRow('Όνομα Κράτησης', ...)` για ομοιομορφία.

### Zero-Regression εγγυήσεις

- **Pure ticket events (όχι hybrid)**: `reservationName` είναι `undefined`, οπότε η συμπεριφορά παραμένει 100% ίδια — εμφανίζει `Πελάτης: <profile name>`.
- **Pure reservation events**: Customer email ήδη έχει "Όνομα" — δεν αλλάζει. Business email αλλάζει μόνο το label string από "Πελάτης" σε "Όνομα Κράτησης".
- **Καμία DB αλλαγή**, καμία schema migration.
- **Καμία αλλαγή σε Stripe/checkout flow** — το `reservation_name` ήδη βρίσκεται στο `session.metadata`.
- **Ώρα/timezone**: ήδη σωστά παντού (24h, Europe/Nicosia) — επιβεβαιώθηκε σε 13 αρχεία.

### Επιβεβαίωση κατανόησης

Σε hybrid event ο πελάτης γράφει "Agamemnonas Paraskevas" στο dialog κράτησης. Μετά την αγορά:
- **Email πελάτη**: στις "Λεπτομέρειες" θα φαίνεται `Όνομα Κράτησης: Agamemnonas Paraskevas` πάνω από την Τοποθεσία.
- **Email επιχειρηματία**: αντί για `Πελάτης: Marinos Koumi` (profile) θα φαίνεται `Όνομα Κράτησης: Agamemnonas Paraskevas` (reservation_name).
- **Push/in-app επιχείρησης**: "Agamemnonas Paraskevas - 3 εισιτήρια".

Ώρες παραμένουν 24h Κύπρου (π.χ. `22:00`, όχι `10:00 PM`) — όπως ήδη είναι.

