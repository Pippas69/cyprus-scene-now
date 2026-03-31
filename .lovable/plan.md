

## Ενοποίηση Type Tabs + Event Dropdown σε ένα επίπεδο

### Πρόβλημα
Στη σελίδα Διαχείρισης (reservations dashboard), για clubs/events/performances υπάρχουν δύο ξεχωριστά UI elements:
1. Badge tabs ανά τύπο (Εισιτήριο / Κράτηση / Εισιτήριο & Κράτηση)
2. Dropdown ημερομηνίας κάτω από το επιλεγμένο tab

Ο χρήστης θέλει **ένα μόνο badge ανά τύπο** που λειτουργεί ως dropdown — πατάς πάνω του και βλέπεις απευθείας τα events αυτού του τύπου.

### Λύση

**Αρχείο:** `src/components/business/reservations/ReservationDashboard.tsx`

Αντικατάσταση των type tabs + separate dropdown με **ένα Select/dropdown badge ανά τύπο**:

- Κάθε τύπος που έχει events εμφανίζεται ως **ένα rounded pill/badge** με τον τίτλο (π.χ. "Εισιτήριο") και τον συνολικό αριθμό
- Αν ο τύπος έχει **1 event** → απλό button, πατάς και επιλέγεται αυτόματα
- Αν ο τύπος έχει **2+ events** → dropdown badge, πατάς και βλέπεις τα events με ημερομηνία + count ανά event
- Το active badge (ο τύπος που είναι επιλεγμένος) έχει το styling `bg-card shadow-sm border`
- Αφαιρείται εντελώς η δεύτερη γραμμή με το ξεχωριστό date dropdown

**Παράδειγμα UI:**

```text
┌──────────────────┐  ┌──────────────┐  [🔍] [+]
│ Εισιτήριο (13) ▼ │  │ Κράτηση (5)  │
└──────────────────┘  └──────────────┘
        │
        ▼ (dropdown opens)
  ┌─────────────────────┐
  │  5 Μαρτίου    (0)   │
  │  5 Μαρτίου    (0)   │
  │  6 Μαρτίου    (0)   │
  │  6 Μαρτίου    (8)   │
  │ ✓ 11 Μαρτίου  (5)   │
  └─────────────────────┘
```

### Λογική
- Κάθε type badge γίνεται `Select` component με rounded-full styling
- Στο `onValueChange`, γίνεται set και το `activeTypeTab` (από τον τύπο του event) και το `selectedEventId`
- Αν ένας τύπος έχει μόνο 1 event, εμφανίζεται ως button (όχι dropdown) — click = επιλογή
- Ο τίτλος στο dropdown δείχνει ημερομηνία + count badge, ακριβώς όπως τώρα

### Σημείωση για Performances
Οι παραστάσεις (theatre, music, dance, kids) υποστηρίζουν **μόνο ticket events**, οπότε θα εμφανίζεται μόνο ένα badge "Εισιτήρια" (πληθυντικό αν >1 event).

### Τεχνικές λεπτομέρειες
- Αφαίρεση του separate dropdown block (γραμμές ~598-626)
- Μετατροπή των type tab buttons σε conditional Select ή button ανάλογα με πλήθος events
- Ο πληθυντικός "Εισιτήρια" vs ενικός "Εισιτήριο" βασίζεται στο πλήθος events του τύπου
- Translations update: προσθήκη `tickets: 'Εισιτήρια'` (πληθυντικός)

