

## Ενοποίηση Design Πινάκων Κρατήσεων

### Πρόβλημα
Ο πίνακας κρατήσεων στο normal mode (1η φωτογραφία) έχει σωστό dark navy design, ενώ οι πίνακες στο kaliva mode (ticket-only, reservation, hybrid — 2η φωτογραφία) χρησιμοποιούν `<Card>` wrapper που δίνει διαφορετικό μπλε background.

### Λύση
Αντικατάσταση του `<Card>` wrapper στα 3 σημεία του kaliva mode με `<div className="rounded-md border">` — ίδιο με το normal mode — ώστε όλοι οι πίνακες να έχουν ενιαίο design.

### Αρχείο
`src/components/business/reservations/DirectReservationsList.tsx`

### Αλλαγές
1. **Ticket-only table (γραμμή ~858)**: `<Card>` → `<div className="rounded-md border w-full overflow-x-auto">`
2. **Empty state cards (γραμμές ~935, ~920)**: Παραμένουν `<Card>` (empty states δεν επηρεάζονται)
3. **Hybrid/Reservation table (γραμμή ~942)**: `<Card>` → `<div className="rounded-md border w-full overflow-x-auto">`

Αυτό θα κάνει τους πίνακες εισιτηρίων και κρατήσεων εκδηλώσεων να φαίνονται ακριβώς όπως ο πίνακας direct reservations.

