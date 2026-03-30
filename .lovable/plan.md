

## Διόρθωση: Editing ονόματος δημιουργεί duplicates + Σφάλμα αποθήκευσης

### Ανάλυση Προβλημάτων

**Πρόβλημα 1 — Duplicate CRM entries**: Υπάρχει trigger `trg_crm_guest_from_ticket` που εκτελείται σε `AFTER UPDATE OF guest_name` στον πίνακα `tickets`. Αυτό καλεί `upsert_crm_guest_identity` η οποία για ghosts κάνει ΠΑΝΤΑ INSERT νέο record. Αποτέλεσμα: κάθε αλλαγή ονόματος = νέος πελάτης στο CRM.

**Πρόβλημα 2 — Σφάλμα αποθήκευσης**: Κάποια tickets δεν μπορούν να ενημερωθούν λόγω RLS. Η πολιτική ενημέρωσης ελέγχει `event_id` μέσω JOIN σε `events → businesses`, αλλά αν κάποιο ticket δεν έχει `event_id` ή η σχέση δεν ταιριάζει, αποτυγχάνει.

### Λύση

#### 1. Database Migration — Αφαίρεση `guest_name` από τα trigger columns

Αλλαγή του trigger ώστε να ΜΗΝ εκτελείται σε `UPDATE OF guest_name`. Η αλλαγή ονόματος είναι καθαρά cosmetic/edit — δεν πρέπει να δημιουργεί νέο CRM entry.

```sql
DROP TRIGGER IF EXISTS trg_crm_guest_from_ticket ON public.tickets;
CREATE TRIGGER trg_crm_guest_from_ticket
AFTER INSERT OR UPDATE OF user_id, event_id, order_id, status
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_ticket();
```

Σημείωση: Το `guest_name` αφαιρείται από τη λίστα columns. Ο trigger θα εκτελείται μόνο σε INSERT (νέο ticket) ή αλλαγή `status` (check-in), ΟΧΙ σε edit ονόματος.

#### 2. Database Migration — Αντίστοιχο fix για reservations trigger

Ομοίως, αφαίρεση `reservation_name` από τον trigger `trg_crm_guest_from_reservation` ώστε να μην δημιουργούνται duplicates ούτε από reservations:

```sql
DROP TRIGGER IF EXISTS trg_crm_guest_from_reservation ON public.reservations;
CREATE TRIGGER trg_crm_guest_from_reservation
AFTER INSERT OR UPDATE OF user_id, phone_number, business_id, event_id
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_reservation();
```

#### 3. Cleanup — Διαγραφή ορφανών/duplicate CRM entries

Αφαίρεση ghost CRM entries που δεν αντιστοιχούν σε κανένα πραγματικό ticket ή reservation (τα duplicates που δημιουργήθηκαν από edits).

#### 4. DirectReservationsList.tsx — Ενημέρωση crm_guests κατά το edit ονόματος

Μετά την επιτυχή ενημέρωση του `guest_name` στο tickets table, ο κώδικας θα ενημερώνει επίσης τον αντίστοιχο **υπάρχοντα** CRM guest record (αν υπάρχει) αντί να βασίζεται στον trigger. Αυτό γίνεται μέσω RPC ή απευθείας UPDATE στο `crm_guests` table, αντιστοιχίζοντας ticket → order → crm_guest.

#### 5. RLS Fix — Ευρύτερη update πολιτική

Προσθήκη/ενημέρωση RLS policy ώστε οι business owners να μπορούν να κάνουν UPDATE σε ΟΛΑ τα tickets (όχι μόνο manual) για τα events τους — ειδικά για πεδία όπως `guest_name`, `guest_city`. Η υπάρχουσα πολιτική "Business owners can update tickets for their events" καλύπτει αυτό θεωρητικά, αλλά θα επιβεβαιωθεί ότι δεν υπάρχει conflict.

### Αρχεία
- Database migration: trigger fix + cleanup duplicates + RLS
- `DirectReservationsList.tsx`: update CRM guest on name edit (αντί trigger)

