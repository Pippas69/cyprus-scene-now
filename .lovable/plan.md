

## Σχέδιο: Διόρθωση flash "Δεν υπάρχουν αγορές εισιτηρίων" + Βελτίωση ταχύτητας CRM

### Πρόβλημα 1: Flash empty state στη Διαχείριση

**Αιτία**: Στη `fetchReservations()`, ακόμα και σε silent refetch (μετά από edit), η γραμμή `setTicketOnlyOrders([])` (line 369) αδειάζει τη λίστα πριν φορτωθούν τα νέα δεδομένα. Αυτό κάνει το `ticketOnlyOrders.length === 0` → εμφανίζεται το empty state.

**Λύση**: Αφαίρεση του `setTicketOnlyOrders([])` κατά τα silent refetches. Τα παλιά δεδομένα παραμένουν ορατά μέχρι να φτάσουν τα νέα.

**Αρχείο**: `src/components/business/reservations/DirectReservationsList.tsx`
- Line ~367-373: Αλλαγή ώστε να μην αδειάζει τα ticketOnlyOrders σε silent mode
- Ίδια λογική εφαρμόζεται και στο `setReservations` αν γίνεται clear

### Πρόβλημα 2: Καθυστέρηση ενημέρωσης CRM

**Αιτία**: Το `useRealtimeCrm` hook έχει debounce 500ms, αλλά το κυρίως πρόβλημα είναι ότι η invalidation ενεργοποιεί πλήρες refetch όλων των δεδομένων (guests + stats + tags + notes) — πολλαπλά queries στη σειρά.

**Λύση**:
1. Μείωση debounce από 500ms σε 300ms στο `useRealtimeCrm.ts`
2. Στο `useCrmGuests.ts`: Προσθήκη `keepPreviousData: true` (placeholderData) στο react-query config ώστε να μην εμφανίζεται loading state κατά τα refetches — τα παλιά δεδομένα παραμένουν ορατά μέχρι να φτάσουν τα νέα

**Αρχεία**:
- `src/hooks/useRealtimeCrm.ts`: debounce 500→300
- `src/hooks/useCrmGuests.ts`: προσθήκη `placeholderData` option

