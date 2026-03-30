

## Δύο Αλλαγές: Realtime Check-ins + Αφαίρεση +357

### 1. Realtime Check-ins χωρίς Refresh

**Πρόβλημα**: Το component ήδη ακούει realtime αλλαγές στον πίνακα `reservations`, αλλά **δεν ακούει αλλαγές στον πίνακα `tickets`**. Όταν γίνεται check-in (scan QR), η στήλη `status` στο `tickets` αλλάζει σε `used`, αλλά ο υπάλληλος δεν το βλέπει χωρίς refresh.

**Λύση στο `DirectReservationsList.tsx` (γραμμές 243-254)**:
- Προσθήκη δεύτερου realtime channel που ακούει `postgres_changes` στον πίνακα `tickets`
- Όταν αλλάξει κάτι στα tickets, καλείται `fetchReservations(true)` (silent refresh) -- ίδιο pattern με τις reservations
- Cleanup στο return: `supabase.removeChannel()` και για τα δύο channels

**Database**: Το `tickets` table πρέπει να είναι στο realtime publication. Θα χρειαστεί migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;`

### 2. Αφαίρεση +357 από τηλέφωνα

**Πρόβλημα**: Τα τηλέφωνα εμφανίζονται ολόκληρα (π.χ. `+35799123456`) και χαλάνε το design.

**Λύση στο `DirectReservationsList.tsx`**:
- Προσθήκη helper function `stripCountryCode` που αφαιρεί το `+357` (ή οποιοδήποτε country code) από την αρχή του αριθμού
- Εφαρμογή σε **όλα τα σημεία** που εμφανίζεται `phone_number` ή `buyer_phone`:
  - Γραμμή 1164-1165 (ticket-only: buyer_phone)
  - Γραμμή 1332-1335 (reservation mode: phone_number)
  - Γραμμή 1478-1482 (hybrid mode: phone_number)

Η function θα αφαιρεί μόνο το `+357` (Cyprus code) αφού αυτό ζητήθηκε, αφήνοντας τον 8ψήφιο αριθμό.

### Αρχεία
- `DirectReservationsList.tsx`: realtime tickets channel + stripCountryCode helper
- Database migration: enable realtime on tickets table

