

## Πλάνο: Δυναμικά Tabs ανά Τύπο Event για Club/Event/Performance Επιχειρήσεις

### Τρέχουσα Κατάσταση
Για club/event/performance επιχειρήσεις (`isTicketLinked = true`), υπάρχει ένα dropdown «Εκδηλώσεις» που δείχνει όλα τα events μαζί με τον τύπο σε παρένθεση. Δεν υπάρχει διαχωρισμός ανά τύπο.

### Τι Αλλάζει

Για τις επιχειρήσεις `isTicketLinked`, αντικαθιστούμε το ενιαίο dropdown με **δυναμικά tabs ανά τύπο event**:

1. **Ομαδοποίηση events σε 3 κατηγορίες:**
   - `ticketEvents` → events με `event_type = 'ticket'`
   - `reservationEvents` → events με `event_type = 'reservation'` ή `null`
   - `hybridEvents` → events με `event_type = 'ticket_reservation'`

2. **Εμφάνιση tabs μόνο για τύπους που υπάρχουν:**
   - Αν υπάρχουν μόνο ticket events → φαίνεται μόνο tab «Εισιτήριο»
   - Αν υπάρχουν ticket + hybrid → tabs «Εισιτήριο» και «Εισιτήριο & Κράτηση»
   - Αν υπάρχουν και οι 3 τύποι → 3 tabs

3. **Dropdown μέσα στο tab:**
   - Αν ένα tab έχει **1 event** → αυτόματη επιλογή, χωρίς dropdown
   - Αν ένα tab έχει **2+ events** → dropdown με ημερομηνίες και αριθμό κρατήσεων

4. **Νέο state:**
   - `activeTypeTab`: `'ticket' | 'reservation' | 'ticket_reservation'` — ποιο tab τύπου είναι ενεργό
   - Αυτόματο default στο πρώτο διαθέσιμο tab
   - Η επιλογή event μέσα σε κάθε tab τροφοδοτεί το υπάρχον `selectedEventId`

### UI Layout (για isTicketLinked businesses)

```text
┌──────────────┐  ┌──────────┐  ┌─────────────────────┐
│  Εισιτήριο   │  │ Κράτηση  │  │ Εισιτήριο & Κράτηση │
└──────────────┘  └──────────┘  └─────────────────────┘
        ↓ (αν 2+ events)
  ┌────────────────────────────┐
  │ ▼ 28 Μαρτίου  (3)         │
  │   5 Απριλίου  (7)         │
  └────────────────────────────┘

  ┌──────────┐ ┌──────────┐
  │Διαχείριση│ │ Έλεγχος  │    ← υπάρχοντα sub-tabs
  └──────────┘ └──────────┘
```

### Για Dining/Bar Επιχειρήσεις
**Καμία αλλαγή.** Διατηρούν τα 2 badges «Κρατήσεις» + «Εκδηλώσεις» όπως είναι.

### Αρχείο που τροποποιείται
- `src/components/business/reservations/ReservationDashboard.tsx`

### Τεχνική Υλοποίηση
- `useMemo` για ομαδοποίηση events σε 3 buckets
- Νέο state `activeTypeTab` με auto-default
- Κάθε αλλαγή tab → auto-select πρώτο (ή μοναδικό) event εκείνου του τύπου → ενημερώνεται `selectedEventId`
- Τα sub-tabs (Διαχείριση/Έλεγχος) και τα components κάτω (`DirectReservationsList`, `KalivaStaffControls`) παραμένουν ως έχουν

