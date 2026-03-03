

## Σχέδιο: Ticket-only events → Badge + Dialog flow (όπως το Kaliva, αλλά απλοποιημένο)

### Τι αλλάζει

Σήμερα, τα ticket-only events εμφανίζουν ένα ολόκληρο `TicketPurchaseCard` inline στη σελίδα. Ο χρήστης θέλει αντ' αυτού ένα **badge/button** που ανοίγει **dialog** με τη διαδικασία αγοράς — ίδια λογική με το Kaliva αλλά χωρίς:
- Επιλογή θέσης (seating)
- Ηλικίες
- Τηλέφωνο / ειδικά αιτήματα
- Minimum charge

### Βήματα υλοποίησης

**1. Νέο component: `TicketPurchaseFlow`**
- Dialog/Drawer (mobile-aware, όπως το Kaliva)
- Περιεχόμενο σε 2 βήματα:
  - **Βήμα 1**: Επιλογή εισιτηρίων (tier selector με +/- κουμπιά), εισαγωγή ονόματος ανά εισιτήριο
  - **Βήμα 2**: Email αγοραστή, σύνοψη, κουμπί "Λήψη Εισιτηρίων" / πληρωμής
- Κάθε εισιτήριο → ξεχωριστό QR code με το αντίστοιχο όνομα (ήδη υποστηρίζεται στο `create-ticket-checkout`)
- Στέλνει `guests` array με `name` μόνο (age = 0 ή null) στο edge function

**2. Αλλαγή στο `EventDetail.tsx`**
- Αντί για `<TicketPurchaseCard>` inline, εμφανίζεται ένα **`RippleButton`** (badge-style) με icon εισιτηρίου
- Πατώντας το, ανοίγει το νέο `TicketPurchaseFlow` dialog
- Ισχύει για **κάθε** ticket-only event (και ticket_and_reservation χωρίς `ticket_reservation_linked`)

**3. Edge function**: Καμία αλλαγή — ήδη δέχεται `guests` array

### Τεχνικές λεπτομέρειες

- Το νέο component θα χρησιμοποιεί `Dialog`/`Drawer` based on `useIsMobile()` (ίδιο pattern με Kaliva)
- Guest fields: μόνο **Όνομα** (Input) — χωρίς ηλικία
- Ο αριθμός guest fields συγχρονίζεται αυτόματα με το σύνολο εισιτηρίων
- Η υπάρχουσα `TicketPurchaseCard` παραμένει ως component αλλά δεν χρησιμοποιείται πλέον inline στο EventDetail (μπορεί να χρειαστεί για embedded χρήσεις)

