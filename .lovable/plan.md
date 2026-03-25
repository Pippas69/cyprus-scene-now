

## Σύνοψη Αλλαγής

**Πρόβλημα:** Όταν ο Marinos Koumi κάνει κράτηση με διαφορετικό όνομα (π.χ. "Giorgos"), το σύστημα δεν αναγνωρίζει ότι είναι ο ίδιος χρήστης και δημιουργεί ξεχωριστό ghost profile. Αποτέλεσμα: 3 κρατήσεις = 3 CRM entries.

**Λύση:** Αν υπάρχει `user_id`, **ΠΑΝΤΑ** συνδέεται στον registered χρήστη — ανεξάρτητα από το όνομα στη φόρμα. Στο CRM εμφανίζεται το **πραγματικό όνομα του account** (π.χ. "Marinos Koumi"), όχι αυτό που πληκτρολόγησε.

## Τι αλλάζει

### 1. Database migration — 2 functions + cleanup

**`sync_crm_guest_from_ticket_data`**: Αφαίρεση name-matching logic (γραμμές 54-62). Αν `p_user_id IS NOT NULL`, πάντα `v_effective_user_id := p_user_id` και χρήση `v_profile_full_name` αντί `p_guest_name`.

**`auto_create_crm_guest_from_reservation`**: Ίδια αλλαγή (γραμμές 127-137). Αν `NEW.user_id IS NOT NULL`, πάντα σύνδεση με τον registered user και χρήση `v_profile_full_name` αντί `NEW.reservation_name`.

**Data cleanup SQL:**
- Εντοπισμός ghost profiles που δημιουργήθηκαν από κρατήσεις με `user_id` — διαγραφή τους
- Ενημέρωση υπαρχόντων registered CRM entries ώστε `guest_name` = πραγματικό profile name

### Αποτέλεσμα

| Πριν | Μετά |
|------|------|
| 3 κρατήσεις → 3 CRM entries (Giorgos, Marinos, Marios) | 3 κρατήσεις → **1 CRM entry** (Marinos Koumi) |
| Ghost profiles με λάθος στοιχεία | Μόνο party members χωρίς account γίνονται ghost |

