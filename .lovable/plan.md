

# Πλάνο: Ολοκλήρωση Reservation-Only Events & QR Σύστημα Καλεσμένων

## Περίληψη Προβλήματος

1. **Events δωρεάν εισόδου** εμφανίζονται στο dropdown κρατήσεων — πρέπει να εξαιρεθούν.
2. **Events μόνο με κράτηση** δεν έχουν σωστή διαχείριση: λείπει η συλλογή ονομάτων/ηλικιών καλεσμένων, τα ατομικά QR codes και η παρακολούθηση check-in.
3. Στη στήλη Minimum Charge, η παρένθεση (πίστωση εισιτηρίων) πρέπει να κρύβεται σε reservation-only events.

## Τι ΔΕΝ αλλάζει

- Η λογική **Εισιτήριο & Κράτηση** (hybrid) μένει ακριβώς ως έχει — τέλεια.

---

## Αλλαγές

### 1. Φιλτράρισμα free events από το dashboard κρατήσεων
**Αρχείο:** `ReservationDashboard.tsx`
- Στο query `fetchEvents`, προσθήκη `.not('event_type', 'in', '("free","free_entry")')` ώστε τα free events να μην εμφανίζονται στο dropdown ούτε να μετρώνται στα badges.

### 2. Συλλογή ονομάτων & ηλικιών καλεσμένων στο Reservation-only checkout
**Αρχείο:** `ReservationEventCheckout.tsx`
- Προσθήκη `guests` state array (`{ name: string; age: string }[]`) που συγχρονίζεται με το `partySize` (ίδιο pattern με `KalivaTicketReservationFlow`).
- Στο Step 2, μετά τον επιλογέα μεγέθους παρέας, rendering input rows για όνομα + ηλικία κάθε καλεσμένου (ίδιο UI).
- Validation: όλα τα ονόματα/ηλικίες πρέπει να συμπληρωθούν πριν προχωρήσει.
- Αποστολή `guests` array στο edge function.

### 3. Backend: Αποθήκευση guest data στο checkout
**Αρχείο:** `supabase/functions/create-reservation-event-checkout/index.ts`
- Αποδοχή `guests` array στο request body.
- Αποθήκευση στο Stripe checkout metadata ως serialized JSON (`guests`).

### 4. Backend: Δημιουργία ατομικών tickets μετά πληρωμή
**Αρχείο:** `supabase/functions/process-reservation-event-payment/index.ts`
- Μετά τη δημιουργία/επιβεβαίωση της κράτησης, parse `guests` metadata.
- Δημιουργία `ticket_orders` row με `linked_reservation_id` → reservation.
- Δημιουργία ατομικών `tickets` rows ανά καλεσμένο (κάθε ένα με `guest_name`, `guest_age`, μοναδικό `qr_code_token`, status `valid`).
- Αυτό ενεργοποιεί αυτόματα τα check-in counts στο dashboard (η υπάρχουσα λογική `fetchCheckInCounts` λειτουργεί ήδη μέσω `ticket_orders.linked_reservation_id`).

### 5. Backend: Ίδια λογική για δωρεάν κρατήσεις
**Αρχείο:** `supabase/functions/create-free-reservation-event/index.ts`
- Αποδοχή `guests` array.
- Μετά τη δημιουργία κράτησης, δημιουργία `ticket_orders` + ατομικών `tickets` ίδια λογική με το βήμα 4.

### 6. Απόκρυψη παρένθεσης στη στήλη Minimum Charge
**Αρχείο:** `DirectReservationsList.tsx`
- Επιβεβαίωση ότι για reservation-only events (`selectedEventType === 'reservation'`), η παρένθεση `(ticket_credit_cents)` κρύβεται πλήρως.

### 7. User Dashboard: QR codes για reservation-only events
**Αρχείο:** `MyReservations.tsx`
- Για reservation-only events, fetch linked tickets (μέσω `ticket_orders.linked_reservation_id`) και εμφάνιση ατομικών QR cards ανά καλεσμένο — ίδιο pattern με τα hybrid events.
- Κατάσταση: εμφάνιση "Επιβεβαιωμένη" αφού γίνει accepted, και check-in status μετά τη σάρωση.

---

## Τεχνικές Λεπτομέρειες

- Τα guest tickets χρησιμοποιούν τους υπάρχοντες πίνακες `tickets` και `ticket_orders` — δεν χρειάζονται νέοι πίνακες.
- Η σάρωση QR μέσω `validate-ticket` / `validate-qr` δουλεύει αυτόματα για αυτά τα tickets.
- Stripe metadata limit: 500 chars ανά key. Για μεγάλες παρέες, τα guests θα σπαστούν σε πολλαπλά metadata keys (`guests_0`, `guests_1`, ...).

